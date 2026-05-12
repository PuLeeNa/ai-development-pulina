# AIEX-715: Listing Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Listing Management epic — sellers can create and cancel listings, anyone can browse them, with a live countdown timer on each listing card.

**Architecture:** Server Components fetch data via API routes at request time. `CountdownTimer` and `CancelButton` are small `"use client"` islands. All mutations go through API routes (never direct Prisma from Server Components) to keep access control centralised. `bidCount` is hardcoded to `0` in this epic — AIEX-728 updates it to the real Bid count when the Bid model is added.

**Tech Stack:** Next.js 16 (App Router, TypeScript), Prisma v7 + `@prisma/adapter-pg`, Supabase Postgres, NextAuth v4, Tailwind CSS v4 (dark zinc/amber design system)

---

## File Map

| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — add Listing model + User.listings |
| `app/api/listings/route.ts` | Create — GET all + POST create |
| `app/api/listings/[id]/route.ts` | Create — GET single + DELETE cancel |
| `app/listings/page.tsx` | Create — browse page (Server Component) |
| `app/listings/new/page.tsx` | Create — create form ("use client") |
| `app/listings/[id]/page.tsx` | Create — detail page (Server Component) |
| `app/components/CountdownTimer.tsx` | Create — live countdown ("use client") |
| `app/components/CancelButton.tsx` | Create — cancel action ("use client") |
| `__tests__/api/listings/listings.test.ts` | Create — unit tests for GET + POST |
| `__tests__/api/listings/listing-id.test.ts` | Create — unit tests for GET[id] + DELETE |

---

## Task 1: Prisma Schema + Migration (AIEX-717)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update `prisma/schema.prisma`**

Replace the entire file:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  username     String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  listings     Listing[]
}

model Listing {
  id            String   @id @default(cuid())
  sellerId      String
  seller        User     @relation(fields: [sellerId], references: [id])
  title         String
  description   String
  photoUrl      String
  startingPrice Float
  closingTime   DateTime
  cancelled     Boolean  @default(false)
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd "c:\projects\claudeproject\ai-development-pulina"
npx prisma migrate dev --name add-listing
```

Expected:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(AIEX-717): add Listing model and run Prisma migration"
```

---

## Task 2: TDD — GET /api/listings + POST /api/listings (AIEX-719, AIEX-725)

**Files:**
- Create: `__tests__/api/listings/listings.test.ts`
- Create: `app/api/listings/route.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/listings/listings.test.ts
import { GET, POST } from "@/app/api/listings/route"
import { NextRequest } from "next/server"

const mockFindMany = jest.fn()
const mockCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/listings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("GET /api/listings", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns all non-cancelled listings ordered by closingTime", async () => {
    const listings = [
      { id: "1", title: "Air Max", photoUrl: "http://img.com/1.jpg", startingPrice: 100, closingTime: new Date("2026-06-01"), sellerId: "u1", createdAt: new Date() },
    ]
    mockFindMany.mockResolvedValue(listings)
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cancelled: false },
        orderBy: { closingTime: "asc" },
      })
    )
  })
})

describe("POST /api/listings", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makePostRequest({ title: "t", description: "d", photoUrl: "http://p.com", startingPrice: 100, closingTime: new Date(Date.now() + 3600000).toISOString() }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when required fields are missing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({ title: "t" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("All fields are required")
  })

  it("returns 400 when startingPrice is zero", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({
      title: "t", description: "d", photoUrl: "http://p.com",
      startingPrice: 0, closingTime: new Date(Date.now() + 3600000).toISOString(),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Starting price must be greater than zero")
  })

  it("returns 400 when closingTime is in the past", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({
      title: "t", description: "d", photoUrl: "http://p.com",
      startingPrice: 100, closingTime: new Date(Date.now() - 3600000).toISOString(),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Closing time must be in the future")
  })

  it("creates listing and returns 201 with id on valid input", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockCreate.mockResolvedValue({ id: "listing-1" })
    const closingTime = new Date(Date.now() + 3600000).toISOString()
    const res = await POST(makePostRequest({
      title: "Air Max", description: "Rare pair", photoUrl: "http://img.com/1.jpg",
      startingPrice: 150, closingTime,
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe("listing-1")
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sellerId: "u1", title: "Air Max", startingPrice: 150 }),
    }))
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
cd "c:\projects\claudeproject\ai-development-pulina"
npm test -- __tests__/api/listings/listings.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/listings/route'`

- [ ] **Step 3: Create `app/api/listings/route.ts`**

```ts
// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const { prisma } = await import("@/lib/prisma")
  const listings = await prisma.listing.findMany({
    where: { cancelled: false },
    orderBy: { closingTime: "asc" },
    select: {
      id: true,
      title: true,
      photoUrl: true,
      startingPrice: true,
      closingTime: true,
      sellerId: true,
      createdAt: true,
    },
  })
  return NextResponse.json(listings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, description, photoUrl, startingPrice, closingTime } = await req.json()

  if (!title || !description || !photoUrl || !startingPrice || !closingTime)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })

  if (Number(startingPrice) <= 0)
    return NextResponse.json({ error: "Starting price must be greater than zero" }, { status: 400 })

  if (new Date(closingTime) <= new Date())
    return NextResponse.json({ error: "Closing time must be in the future" }, { status: 400 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      title,
      description,
      photoUrl,
      startingPrice: Number(startingPrice),
      closingTime: new Date(closingTime),
    },
  })

  return NextResponse.json({ id: listing.id }, { status: 201 })
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test -- __tests__/api/listings/listings.test.ts
```

Expected:
```
Tests: 6 passed, 6 total
```

- [ ] **Step 5: Commit**

```bash
git add app/api/listings/route.ts __tests__/api/listings/listings.test.ts
git commit -m "feat(AIEX-719): add GET/POST /api/listings with tests"
```

---

## Task 3: TDD — GET /api/listings/[id] + DELETE /api/listings/[id] (AIEX-722)

**Files:**
- Create: `__tests__/api/listings/listing-id.test.ts`
- Create: `app/api/listings/[id]/route.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/listings/listing-id.test.ts
import { GET, DELETE } from "@/app/api/listings/[id]/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const params = { params: { id: "listing-1" } }

const mockListing = {
  id: "listing-1",
  title: "Air Max",
  description: "Rare pair",
  photoUrl: "http://img.com/1.jpg",
  startingPrice: 150,
  closingTime: new Date("2099-01-01"),
  cancelled: false,
  sellerId: "u1",
  seller: { username: "seller1" },
  createdAt: new Date(),
}

describe("GET /api/listings/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 404 when listing not found", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(404)
  })

  it("returns listing with seller.username and bidCount 0", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe("Air Max")
    expect(data.seller.username).toBe("seller1")
    expect(data.bidCount).toBe(0)
  })
})

describe("DELETE /api/listings/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(401)
  })

  it("returns 403 when non-seller attempts to cancel", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "other-user" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Forbidden")
  })

  it("cancels listing and returns 200 when seller with zero bids", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockUpdate.mockResolvedValue({ ...mockListing, cancelled: true })
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { cancelled: true },
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npm test -- __tests__/api/listings/listing-id.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/listings/[id]/route'`

- [ ] **Step 3: Create `app/api/listings/[id]/route.ts`**

```ts
// app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { seller: { select: { username: true } } },
  })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  // bidCount is 0 until Bid model is added in AIEX-728
  return NextResponse.json({ ...listing, bidCount: 0 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
  })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.sellerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // bidCount is always 0 until Bid model is added in AIEX-728
  const bidCount = 0
  if (bidCount > 0)
    return NextResponse.json({ error: "Cannot cancel a listing with bids" }, { status: 403 })

  await prisma.listing.update({
    where: { id: params.id },
    data: { cancelled: true },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test -- __tests__/api/listings/listing-id.test.ts
```

Expected:
```
Tests: 4 passed, 4 total
```

- [ ] **Step 5: Run all tests — verify nothing broken**

```bash
npm test
```

Expected: 15 passed, 0 failed (4 signup + 6 listings + 5 listing-id).

- [ ] **Step 6: Commit**

```bash
git add "app/api/listings/[id]/route.ts" "__tests__/api/listings/listing-id.test.ts"
git commit -m "feat(AIEX-722): add GET/DELETE /api/listings/[id] with tests"
```

---

## Task 4: CountdownTimer Component

**Files:**
- Create: `app/components/CountdownTimer.tsx`

- [ ] **Step 1: Create `app/components/CountdownTimer.tsx`**

```tsx
// app/components/CountdownTimer.tsx
"use client"
import { useState, useEffect } from "react"

interface Props {
  closingTime: string
}

function getTimeRemaining(closingTime: string) {
  const diff = new Date(closingTime).getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

export default function CountdownTimer({ closingTime }: Props) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(closingTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(closingTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [closingTime])

  if (!remaining) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-400 text-black">
        Closed
      </span>
    )
  }

  const parts = []
  if (remaining.days > 0) parts.push(`${remaining.days}d`)
  parts.push(`${remaining.hours}h`)
  parts.push(`${remaining.minutes}m`)
  parts.push(`${remaining.seconds}s`)

  return (
    <span className="text-zinc-400 text-sm">
      Closes in {parts.join(" ")}
    </span>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/CountdownTimer.tsx
git commit -m "feat(AIEX-715): add CountdownTimer client component"
```

---

## Task 5: CancelButton Component

**Files:**
- Create: `app/components/CancelButton.tsx`

- [ ] **Step 1: Create `app/components/CancelButton.tsx`**

```tsx
// app/components/CancelButton.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  listingId: string
}

export default function CancelButton({ listingId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setError(null)
    const res = await fetch(`/api/listings/${listingId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Failed to cancel listing")
      return
    }
    router.push("/listings")
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCancel}
        className="px-4 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
      >
        Cancel listing
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/CancelButton.tsx
git commit -m "feat(AIEX-723): add CancelButton client component"
```

---

## Task 6: Browse Listings Page — /listings (AIEX-726)

**Files:**
- Create: `app/listings/page.tsx`

- [ ] **Step 1: Create `app/listings/page.tsx`**

```tsx
// app/listings/page.tsx
import Link from "next/link"
import Navbar from "@/app/components/Navbar"
import CountdownTimer from "@/app/components/CountdownTimer"

interface Listing {
  id: string
  title: string
  photoUrl: string
  startingPrice: number
  closingTime: string
  sellerId: string
  createdAt: string
}

async function getListings(): Promise<Listing[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/listings`, {
    cache: "no-store",
  })
  if (!res.ok) return []
  return res.json()
}

export default async function ListingsPage() {
  const listings = await getListings()

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Auctions</h1>
          <Link
            href="/listings/new"
            className="bg-amber-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-amber-300 transition-colors text-sm"
          >
            + Create Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-zinc-400 text-lg">No listings yet.</p>
            <p className="text-zinc-600 text-sm mt-2">Be the first to list a pair.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-400/40 transition-colors"
              >
                <div className="aspect-square bg-zinc-800 overflow-hidden">
                  <img
                    src={listing.photoUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <h2 className="text-white font-semibold truncate">{listing.title}</h2>
                  <p className="text-amber-400 font-bold">${listing.startingPrice.toLocaleString()}</p>
                  <CountdownTimer closingTime={listing.closingTime} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all pass, 0 failed.

- [ ] **Step 3: Commit**

```bash
git add app/listings/page.tsx
git commit -m "feat(AIEX-726): add /listings browse page with listing cards"
```

---

## Task 7: Create Listing Page — /listings/new (AIEX-720)

**Files:**
- Create: `app/listings/new/page.tsx`

- [ ] **Step 1: Create `app/listings/new/page.tsx`**

```tsx
// app/listings/new/page.tsx
"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navbar from "@/app/components/Navbar"

export default function NewListingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin")
  }, [status, router])

  if (status === "loading") return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        photoUrl: form.get("photoUrl"),
        startingPrice: Number(form.get("startingPrice")),
        closingTime: new Date(form.get("closingTime") as string).toISOString(),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    const data = await res.json()
    router.push(`/listings/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Create a Listing</h1>
        {error && (
          <p className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm mb-6">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Title</label>
            <input
              name="title"
              type="text"
              placeholder="Nike Air Max 95 OG"
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Description</label>
            <textarea
              name="description"
              placeholder="Describe the condition, size, and any notable details..."
              required
              rows={3}
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Photo URL</label>
            <input
              name="photoUrl"
              type="url"
              placeholder="https://..."
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Starting Price ($)</label>
            <input
              name="startingPrice"
              type="number"
              min="1"
              step="1"
              placeholder="100"
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Closing Time</label>
            <input
              name="closingTime"
              type="datetime-local"
              required
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-400 text-black rounded-lg px-4 py-3 font-semibold hover:bg-amber-300 transition-colors mt-2"
          >
            Create listing
          </button>
        </form>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add app/listings/new/page.tsx
git commit -m "feat(AIEX-720): add /listings/new create listing page"
```

---

## Task 8: Listing Detail Page — /listings/[id] (AIEX-723)

**Files:**
- Create: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Create `app/listings/[id]/page.tsx`**

```tsx
// app/listings/[id]/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Navbar from "@/app/components/Navbar"
import CountdownTimer from "@/app/components/CountdownTimer"
import CancelButton from "@/app/components/CancelButton"

interface Listing {
  id: string
  title: string
  description: string
  photoUrl: string
  startingPrice: number
  closingTime: string
  cancelled: boolean
  sellerId: string
  seller: { username: string }
  bidCount: number
  createdAt: string
}

async function getListing(id: string): Promise<Listing | null> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/listings/${id}`, {
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [listing, session] = await Promise.all([
    getListing(params.id),
    getServerSession(authOptions),
  ])

  if (!listing || listing.cancelled) redirect("/listings")

  const isSeller = session?.user?.id === listing.sellerId
  const isOpen = new Date(listing.closingTime) > new Date()
  const canCancel = isSeller && listing.bidCount === 0 && isOpen

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="aspect-video bg-zinc-800">
            <img
              src={listing.photoUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-white">{listing.title}</h1>
              <CountdownTimer closingTime={listing.closingTime} />
            </div>
            <p className="text-zinc-400">{listing.description}</p>
            <div className="flex items-center gap-6 py-4 border-t border-zinc-800">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Starting price</p>
                <p className="text-amber-400 text-xl font-bold">${listing.startingPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Listed by</p>
                <p className="text-white font-medium">@{listing.seller.username}</p>
              </div>
            </div>
            {canCancel && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs mb-3">No bids placed yet — you can still cancel.</p>
                <CancelButton listingId={listing.id} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/listings/[id]/page.tsx"
git commit -m "feat(AIEX-715): add /listings/[id] detail page with cancel button"
```

---

## Task 9: Manual End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Browse listings (empty state)**

Navigate to http://localhost:3000/listings
Expected: "No listings yet. Be the first to list a pair."

- [ ] **Step 3: Create a listing (AIEX-716 happy path)**

1. Sign in at `/auth/signin`
2. Navigate to `/listings/new`
3. Fill in: Title "Nike Air Max 95 OG", Description "DS size 10", Photo URL (any valid image URL), Price 200, Closing time (2 minutes from now)
4. Click **Create listing**
5. Expected: redirected to `/listings/[id]` showing the listing detail

- [ ] **Step 4: Verify browse page (AIEX-724)**

Navigate to `/listings`
Expected: listing card appears with photo, title, price, and live countdown ticking

- [ ] **Step 5: Test unauthenticated /listings/new redirect**

Sign out, navigate to `/listings/new`
Expected: redirected to `/auth/signin`

- [ ] **Step 6: Test validation errors (AIEX-716 failure paths)**

While signed in, at `/listings/new`:
- Submit with empty title → "All fields are required"
- Submit with closing time in the past → "Closing time must be in the future"
- Submit with starting price 0 → "Starting price must be greater than zero"

- [ ] **Step 7: Test cancel listing (AIEX-721 happy path)**

1. Create a fresh listing with closing time 5 minutes from now
2. On `/listings/[id]` → verify "Cancel listing" button is visible
3. Click **Cancel listing**
4. Expected: redirected to `/listings`, listing no longer appears

- [ ] **Step 8: Test closed listing badge (AIEX-724)**

Create a listing with closing time 1 second from now (use browser dev tools to set it)
Wait for it to expire — card should switch from countdown to amber "Closed" badge

- [ ] **Step 9: Final commit if any changes**

```bash
git status
```

If any uncommitted changes:
```bash
git add .
git commit -m "feat(AIEX-715): complete listing management epic"
```