# AIEX-728 — Sealed Bid Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authenticated non-seller users to place or update a sealed bid on an open listing via a bid form on the listing detail page.

**Architecture:** Three sequential tasks — schema first (Bid model + migration), then the REST API route with all validation guards and upsert logic, then the client-side BidForm component wired into the listing detail page. Each task builds on the previous one.

**Tech Stack:** Prisma 7 + adapter-pg, Next.js 16 App Router, NextAuth v4, TypeScript, Jest, Tailwind v4

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `Bid` model + back-relations on `User` and `Listing` |
| `app/api/listings/[id]/route.ts` | Modify | Replace hardcoded `bidCount: 0` with real Prisma count |
| `__tests__/api/listings/listing-id.test.ts` | Modify | Add `bid.count` mock; update GET/DELETE test setup |
| `app/api/listings/[id]/bid/route.ts` | Create | POST handler — validation + upsert + bidderCount response |
| `__tests__/api/listings/bid.test.ts` | Create | Full test coverage for POST bid route |
| `app/components/BidForm.tsx` | Create | `"use client"` form — submit, inline error, router.refresh() |
| `app/listings/[id]/page.tsx` | Modify | Fetch existingBid; render BidForm for eligible users |

---

## Task 1: Bid model — schema, migration, and existing route updates (AIEX-729)

> **Skill:** Invoke `prisma-schema-change` before editing the schema.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `app/api/listings/[id]/route.ts`
- Modify: `__tests__/api/listings/listing-id.test.ts`

- [ ] **Step 1: Update the existing tests to add the `bid.count` mock**

Open `__tests__/api/listings/listing-id.test.ts`. Add `mockCount` and wire it into the Prisma mock so existing tests don't break when the route starts calling `prisma.bid.count`. Replace the entire file with:

```ts
// __tests__/api/listings/listing-id.test.ts
import { GET, DELETE } from "@/app/api/listings/[id]/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockCount = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    bid: {
      count: mockCount,
    },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const params = { params: Promise.resolve({ id: "listing-1" }) }

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
  beforeEach(() => {
    jest.clearAllMocks()
    mockCount.mockResolvedValue(0)
  })

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
  beforeEach(() => {
    jest.clearAllMocks()
    mockCount.mockResolvedValue(0)
  })

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

  it("returns 403 when seller tries to cancel listing with bids", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(2)
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Cannot cancel a listing with bids")
  })
})
```

- [ ] **Step 2: Run existing tests — expect them to fail (route still returns hardcoded 0)**

```bash
npm test -- --testPathPattern="listing-id" --no-coverage
```

Expected: some tests PASS, the new "returns 403 when seller tries to cancel listing with bids" FAILS because the route hardcodes `bidCount = 0`.

- [ ] **Step 3: Update `prisma/schema.prisma` — add Bid model and back-relations**

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
  bids         Bid[]
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
  bids          Bid[]
}

model Bid {
  id        String   @id @default(cuid())
  listingId String
  bidderId  String
  amount    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  listing   Listing  @relation(fields: [listingId], references: [id])
  bidder    User     @relation(fields: [bidderId], references: [id])

  @@unique([listingId, bidderId])
}
```

- [ ] **Step 4: Run the Prisma migration**

```bash
npx prisma migrate dev --name add-bid-model
```

Expected output includes:
```
The following migration(s) have been created and applied from new schema changes:
migrations/
  └─ YYYYMMDDHHMMSS_add_bid_model/
    └─ migration.sql
```

- [ ] **Step 5: Update `app/api/listings/[id]/route.ts` — replace hardcoded bidCount with real Prisma counts**

Replace the entire file:

```ts
// app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { seller: { select: { username: true } } },
  })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const bidCount = await prisma.bid.count({ where: { listingId: id } })
  return NextResponse.json({ ...listing, bidCount })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.sellerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const bidCount = await prisma.bid.count({ where: { listingId: id } })
  if (bidCount > 0)
    return NextResponse.json({ error: "Cannot cancel a listing with bids" }, { status: 403 })

  await prisma.listing.update({
    where: { id },
    data: { cancelled: true },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Run the tests — all should pass**

```bash
npm test -- --testPathPattern="listing-id" --no-coverage
```

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations app/api/listings/[id]/route.ts __tests__/api/listings/listing-id.test.ts
git commit -m "feat(AIEX-729): add Bid model and replace hardcoded bidCount with real Prisma count"
```

---

## Task 2: POST /api/listings/[id]/bid route (AIEX-730)

> **Skill:** Invoke `next-dynamic-route` before creating this file.

**Files:**
- Create: `app/api/listings/[id]/bid/route.ts`
- Create: `__tests__/api/listings/bid.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/api/listings/bid.test.ts`:

```ts
// __tests__/api/listings/bid.test.ts
import { POST } from "@/app/api/listings/[id]/bid/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpsert = jest.fn()
const mockCount = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findUnique: mockFindUnique },
    bid: { upsert: mockUpsert, count: mockCount },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({ authOptions: {} }))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const params = { params: Promise.resolve({ id: "listing-1" }) }

const openListing = {
  id: "listing-1",
  sellerId: "seller-1",
  startingPrice: 100,
  closingTime: new Date("2099-01-01"),
  cancelled: false,
}

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/listings/listing-1/bid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/listings/[id]/bid", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(401)
  })

  it("returns 400 when amount is missing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    const res = await POST(makeRequest({}), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid amount")
  })

  it("returns 400 when amount is not a number", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    const res = await POST(makeRequest({ amount: "abc" }), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid amount")
  })

  it("returns 404 when listing not found", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(404)
  })

  it("returns 403 when listing is cancelled", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue({ ...openListing, cancelled: true })
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Auction has closed")
  })

  it("returns 403 when listing closingTime has passed", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue({ ...openListing, closingTime: new Date("2000-01-01") })
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Auction has closed")
  })

  it("returns 403 when seller bids on own listing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "seller-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("You cannot bid on your own listing")
  })

  it("returns 400 when amount is below startingPrice", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    const res = await POST(makeRequest({ amount: 50 }), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Bid must meet the starting price")
  })

  it("returns 201 with bidderCount on valid first bid", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.bidderCount).toBe(1)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { listingId_bidderId: { listingId: "listing-1", bidderId: "bidder-1" } },
      create: { listingId: "listing-1", bidderId: "bidder-1", amount: 150 },
      update: { amount: 150 },
    })
  })

  it("returns 201 with bidderCount unchanged on upsert (same bidder)", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 200 }), params)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.bidderCount).toBe(1)
  })

  it("accepts bid at exactly startingPrice", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 100 }), params)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run tests — expect all to fail (route doesn't exist yet)**

```bash
npm test -- --testPathPattern="bid.test" --no-coverage
```

Expected: Cannot find module `@/app/api/listings/[id]/bid/route`.

- [ ] **Step 3: Create `app/api/listings/[id]/bid/route.ts`**

```ts
// app/api/listings/[id]/bid/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)

  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const amount = Number(body.amount)

  if (body.amount === undefined || body.amount === null || isNaN(amount))
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.cancelled || new Date(listing.closingTime) <= new Date())
    return NextResponse.json({ error: "Auction has closed" }, { status: 403 })

  if (listing.sellerId === session.user.id)
    return NextResponse.json({ error: "You cannot bid on your own listing" }, { status: 403 })

  if (amount < listing.startingPrice)
    return NextResponse.json({ error: "Bid must meet the starting price" }, { status: 400 })

  await prisma.bid.upsert({
    where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
    create: { listingId: id, bidderId: session.user.id, amount },
    update: { amount },
  })

  const bidderCount = await prisma.bid.count({ where: { listingId: id } })
  return NextResponse.json({ bidderCount }, { status: 201 })
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
npm test -- --testPathPattern="bid.test" --no-coverage
```

Expected: 10 tests PASS, 0 failures.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/listings/[id]/bid/route.ts __tests__/api/listings/bid.test.ts
git commit -m "feat(AIEX-730): add POST /api/listings/[id]/bid route with validation and upsert"
```

---

## Task 3: BidForm component and listing page integration (AIEX-731)

> **Skills:** Invoke `ui-style` before writing the component for correct Tailwind v4 class patterns.

**Files:**
- Create: `app/components/BidForm.tsx`
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Create `app/components/BidForm.tsx`**

```tsx
// app/components/BidForm.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface BidFormProps {
  listingId: string
  startingPrice: number
  existingBid?: number
}

export default function BidForm({ listingId, startingPrice, existingBid }: BidFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState(existingBid?.toString() ?? "")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/listings/${listingId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Something went wrong")
        return
      }
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="bid-amount" className="text-zinc-500 text-xs uppercase tracking-wide block mb-1">
          Your bid
        </label>
        <div className="flex gap-2">
          <input
            id="bid-amount"
            type="number"
            min={startingPrice}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`$${startingPrice.toLocaleString()} min`}
            required
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? "Placing…" : existingBid ? "Update bid" : "Place bid"}
          </button>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 2: Update `app/listings/[id]/page.tsx` — fetch existingBid and render BidForm**

Replace the entire file:

```tsx
// app/listings/[id]/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Navbar from "@/app/components/Navbar"
import CountdownTimer from "@/app/components/CountdownTimer"
import CancelButton from "@/app/components/CancelButton"
import BidForm from "@/app/components/BidForm"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { username: true } } },
    }),
    getServerSession(authOptions),
  ])

  if (!listing || listing.cancelled) redirect("/listings")

  const existingBid = session?.user?.id
    ? await prisma.bid.findUnique({
        where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
        select: { amount: true },
      })
    : null

  const isSeller = session?.user?.id === listing.sellerId
  const isOpen = new Date(listing.closingTime) > new Date()
  const bidCount = await prisma.bid.count({ where: { listingId: id } })
  const canCancel = isSeller && bidCount === 0 && isOpen

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Back to auctions
        </Link>
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
              <CountdownTimer closingTime={listing.closingTime.toISOString()} />
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
            {!isSeller && isOpen && session && (
              <div className="pt-4 border-t border-zinc-800">
                <BidForm
                  listingId={listing.id}
                  startingPrice={listing.startingPrice}
                  existingBid={existingBid?.amount}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check and full test suite**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Start the dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Sign in as a non-seller user and navigate to an open listing → bid form appears with "Place bid"
- Submit a valid amount → page refreshes, form shows "Update bid" with the amount pre-filled
- Submit an amount below starting price → inline error `"Bid must meet the starting price"`
- Sign in as the seller → no bid form visible (only cancel button if zero bids)
- Navigate to a closed listing → no bid form visible

- [ ] **Step 5: Commit**

```bash
git add app/components/BidForm.tsx app/listings/[id]/page.tsx
git commit -m "feat(AIEX-731): add BidForm component and integrate sealed bid UI into listing detail page"
```
