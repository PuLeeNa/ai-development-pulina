# AIEX-727: Sealed Bidding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sealed bidding to the auction platform — bidders can place/update bids, the API enforces the seal (only bidder count is visible while open), and the listing detail page shows the bid form to eligible bidders.

**Architecture:** Server Component fetches `bidderCount` and `myBid` directly from Prisma and passes them as props to a `"use client"` `BidForm` island. All business rules (seal, guards, upsert) live in `POST /api/listings/[id]/bid`. The existing `GET /api/listings/[id]` route is updated to return real `bidderCount` and viewer-specific `myBid`. `router.refresh()` after submit re-runs the Server Component to update the pre-filled amount.

**Tech Stack:** Next.js 16 (App Router, TypeScript), Prisma v7 + adapter-pg, NextAuth v4, Tailwind CSS v4

---

## File Map

| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — add Bid model + relations |
| `app/api/listings/[id]/bid/route.ts` | Create — POST place/update bid |
| `app/api/listings/[id]/route.ts` | Modify — add real bidderCount + myBid |
| `app/components/BidForm.tsx` | Create — bid form client island |
| `app/listings/[id]/page.tsx` | Modify — add bidderCount, BidForm, fix canCancel |
| `__tests__/api/listings/bid.test.ts` | Create — unit tests for POST /bid |
| `__tests__/api/listings/listing-id-sealed.test.ts` | Create — unit tests for GET seal rules |

---

## Task 1: Prisma Schema + Migration (AIEX-729)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update `prisma/schema.prisma`**

Replace the entire file contents:

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
  listing   Listing  @relation(fields: [listingId], references: [id])
  bidderId  String
  bidder    User     @relation(fields: [bidderId], references: [id])
  amount    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([listingId, bidderId])
}
```

- [ ] **Step 2: Run migration**

```bash
cd "c:\projects\claudeproject\ai-development-pulina"
npx prisma migrate dev --name add-bid
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
git commit -m "feat(AIEX-729): add Bid model and run Prisma migration"
```

---

## Task 2: TDD — POST /api/listings/[id]/bid (AIEX-730)

**Files:**
- Create: `__tests__/api/listings/bid.test.ts`
- Create: `app/api/listings/[id]/bid/route.ts`

- [ ] **Step 1: Write the failing tests**

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

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))

import { getServerSession } from "next-auth"
const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>

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
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/listings/[id]/bid", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(401)
  })

  it("returns 404 when listing not found", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(404)
  })

  it("returns 403 when seller tries to bid", async () => {
    mockSession.mockResolvedValue({ user: { id: "seller-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("You cannot bid on your own listing")
  })

  it("returns 403 when listing is closed", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue({ ...openListing, closingTime: new Date("2000-01-01") })
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("Auction has closed")
  })

  it("returns 400 when amount is below startingPrice", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    const res = await POST(makeRequest({ amount: 50 }), params)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("Bid must meet the starting price")
  })

  it("creates bid and returns 201 with bidderCount on first bid", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique
      .mockResolvedValueOnce(openListing)   // listing lookup
      .mockResolvedValueOnce(null)           // existing bid check → none
    mockUpsert.mockResolvedValue({ id: "bid-1", amount: 150, createdAt: new Date() })
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(201)
    expect((await res.json()).bidderCount).toBe(1)
  })

  it("updates bid and returns 200 with bidderCount on existing bid", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique
      .mockResolvedValueOnce(openListing)                             // listing lookup
      .mockResolvedValueOnce({ id: "bid-1", amount: 100 })            // existing bid → found
    mockUpsert.mockResolvedValue({ id: "bid-1", amount: 200 })
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 200 }), params)
    expect(res.status).toBe(200)
    expect((await res.json()).bidderCount).toBe(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { amount: 200 } })
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npm test -- __tests__/api/listings/bid.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/listings/[id]/bid/route'`

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

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({ where: { id } })
  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.sellerId === session.user.id)
    return NextResponse.json({ error: "You cannot bid on your own listing" }, { status: 403 })

  if (new Date(listing.closingTime) <= new Date())
    return NextResponse.json({ error: "Auction has closed" }, { status: 403 })

  const { amount } = await req.json()
  if (Number(amount) < listing.startingPrice)
    return NextResponse.json({ error: "Bid must meet the starting price" }, { status: 400 })

  const existing = await prisma.bid.findUnique({
    where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
  })
  const isNew = !existing

  await prisma.bid.upsert({
    where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
    create: { listingId: id, bidderId: session.user.id, amount: Number(amount) },
    update: { amount: Number(amount) },
  })

  const bidderCount = await prisma.bid.count({ where: { listingId: id } })
  return NextResponse.json({ bidderCount }, { status: isNew ? 201 : 200 })
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test -- __tests__/api/listings/bid.test.ts
```

Expected: 7 passed, 0 failed.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add "app/api/listings/[id]/bid/route.ts" __tests__/api/listings/bid.test.ts
git commit -m "feat(AIEX-730): add POST /api/listings/[id]/bid with upsert and seal guards"
```

---

## Task 3: TDD — Update GET /api/listings/[id] with Seal Rules (AIEX-735)

**Files:**
- Create: `__tests__/api/listings/listing-id-sealed.test.ts`
- Modify: `app/api/listings/[id]/route.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/listings/listing-id-sealed.test.ts
import { GET } from "@/app/api/listings/[id]/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockCount = jest.fn()
const mockBidFindUnique = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findUnique: mockFindUnique },
    bid: { count: mockCount, findUnique: mockBidFindUnique },
  },
}))

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))

import { getServerSession } from "next-auth"
const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const params = { params: Promise.resolve({ id: "listing-1" }) }

const mockListing = {
  id: "listing-1",
  sellerId: "seller-1",
  seller: { username: "seller1" },
  title: "Air Max",
  description: "Rare",
  photoUrl: "http://img.com/1.jpg",
  startingPrice: 100,
  closingTime: new Date("2099-01-01"),
  cancelled: false,
  createdAt: new Date(),
}

describe("GET /api/listings/[id] — seal rules", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns bidderCount: 0 and myBid: null for unauthenticated user", async () => {
    mockSession.mockResolvedValue(null)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(0)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(0)
    expect(data.myBid).toBeNull()
  })

  it("returns real bidderCount when bids exist", async () => {
    mockSession.mockResolvedValue(null)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(3)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    const data = await res.json()
    expect(data.bidderCount).toBe(3)
  })

  it("returns myBid for authenticated bidder who has bid", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(1)
    mockBidFindUnique.mockResolvedValue({ amount: 150 })
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    const data = await res.json()
    expect(data.myBid).toBe(150)
  })

  it("returns myBid: null for authenticated bidder who has not bid", async () => {
    mockSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(0)
    mockBidFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    const data = await res.json()
    expect(data.myBid).toBeNull()
  })

  it("returns myBid: null for the seller (no own-bid reveal)", async () => {
    mockSession.mockResolvedValue({ user: { id: "seller-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(2)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    const data = await res.json()
    expect(data.myBid).toBeNull()
    expect(mockBidFindUnique).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npm test -- __tests__/api/listings/listing-id-sealed.test.ts
```

Expected: FAIL — tests fail because `bidderCount` is hardcoded 0 and `myBid` is absent.

- [ ] **Step 3: Update `app/api/listings/[id]/route.ts`**

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
  const { authOptions } = await import("@/lib/auth")
  const { prisma } = await import("@/lib/prisma")

  const [listing, session, bidderCount] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { username: true } } },
    }),
    getServerSession(authOptions),
    prisma.bid.count({ where: { listingId: id } }),
  ])

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isNonSellerViewer = session?.user?.id && session.user.id !== listing.sellerId
  const myBidRecord = isNonSellerViewer
    ? await prisma.bid.findUnique({
        where: { listingId_bidderId: { listingId: id, bidderId: session.user.id! } },
        select: { amount: true },
      })
    : null
  const myBid = myBidRecord?.amount ?? null

  return NextResponse.json({ ...listing, bidderCount, myBid })
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

  await prisma.listing.update({ where: { id }, data: { cancelled: true } })
  return NextResponse.json({ success: true })
}
```

Note: the DELETE route now also uses the real bid count for the cancellation guard.

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test -- __tests__/api/listings/listing-id-sealed.test.ts
```

Expected: 5 passed, 0 failed.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all pass (existing listing-id tests may need mock updates — see note below).

**Fix existing tests:** The updated GET route calls `prisma.bid.count` and `prisma.bid.findUnique`, but the existing mock in `__tests__/api/listings/listing-id.test.ts` only mocks `prisma.listing`. Update the mock at the top of that file:

```ts
// Change this:
jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}))

// To this:
jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    bid: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))
```

- [ ] **Step 6: Commit**

```bash
git add "app/api/listings/[id]/route.ts" __tests__/api/listings/listing-id-sealed.test.ts
git commit -m "feat(AIEX-735): add bidderCount and myBid seal rules to GET /api/listings/[id]"
```

---

## Task 4: BidForm Component (AIEX-731)

**Files:**
- Create: `app/components/BidForm.tsx`

- [ ] **Step 1: Create `app/components/BidForm.tsx`**

```tsx
// app/components/BidForm.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  listingId: string
  startingPrice: number
  myBid: number | null
}

export default function BidForm({ listingId, startingPrice, myBid }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const amount = Number(form.get("amount"))

    const res = await fetch(`/api/listings/${listingId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="pt-4 border-t border-zinc-800">
      <h3 className="text-white font-semibold mb-3">
        {myBid ? "Your bid" : "Place your bid"}
      </h3>
      {error && (
        <p className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm mb-3">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <input
            name="amount"
            type="number"
            min={startingPrice}
            step="1"
            defaultValue={myBid ?? ""}
            required
            placeholder={`${startingPrice}`}
            className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <p className="text-zinc-500 text-xs">Minimum ${startingPrice.toLocaleString()}</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 text-black rounded-lg px-4 py-3 font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          {loading ? "Submitting…" : myBid ? "Update bid" : "Place bid"}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/components/BidForm.tsx
git commit -m "feat(AIEX-731): add BidForm client component with pre-fill and update support"
```

---

## Task 5: Update /listings/[id] Page (AIEX-736)

**Files:**
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Replace `app/listings/[id]/page.tsx`**

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

  const [listing, session, bidderCount] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { username: true } } },
    }),
    getServerSession(authOptions),
    prisma.bid.count({ where: { listingId: id } }),
  ])

  if (!listing || listing.cancelled) redirect("/listings")

  const isSeller = session?.user?.id === listing.sellerId
  const isOpen = new Date(listing.closingTime) > new Date()
  const isNonSellerBidder = !!(session?.user?.id && !isSeller)

  const myBid = isNonSellerBidder
    ? (await prisma.bid.findUnique({
        where: {
          listingId_bidderId: { listingId: id, bidderId: session!.user!.id },
        },
        select: { amount: true },
      }))?.amount ?? null
    : null

  const canCancel = isSeller && bidderCount === 0 && isOpen

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
              {isOpen && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">Bidders</p>
                  <p className="text-white font-medium">
                    {bidderCount} {bidderCount === 1 ? "bidder" : "bidders"} so far
                  </p>
                </div>
              )}
            </div>
            {isOpen && isNonSellerBidder && (
              <BidForm
                key={myBid ?? "new"}
                listingId={listing.id}
                startingPrice={listing.startingPrice}
                myBid={myBid}
              />
            )}
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
git commit -m "feat(AIEX-736): add bidder count, BidForm, and fix canCancel on listing detail page"
```

---

## Task 6: Manual End-to-End Verification

- [ ] **Step 1: Run `npx prisma generate` and start dev server**

```bash
npx prisma generate
npm run dev
```

- [ ] **Step 2: Verify sealed display (AIEX-734)**

1. Open any listing at `/listings/[id]` while **not signed in**
2. Expected: "N bidders so far" shown, no bid form visible

- [ ] **Step 3: Test self-bid block (AIEX-728 failure path)**

1. Sign in as the seller of a listing
2. Navigate to that listing
3. Expected: no bid form shown (seller cannot bid)

- [ ] **Step 4: Place a first bid (AIEX-728 happy path)**

1. Sign in as a **different user** (not the seller)
2. Navigate to an open listing
3. Enter a valid amount ≥ starting price, click **Place bid**
4. Expected: page refreshes, form now shows "Your bid" with the submitted amount pre-filled, bidder count increments to 1

- [ ] **Step 5: Update the bid (AIEX-732 happy path)**

1. While still on the listing as the same bidder
2. Change the amount in the form and click **Update bid**
3. Expected: page refreshes, new amount shown pre-filled

- [ ] **Step 6: Verify seller sees count but no amount**

1. Sign in as the **seller** of the listing with 1 bidder
2. Navigate to that listing
3. Expected: "1 bidder so far" shown, no bid form, no amount visible

- [ ] **Step 7: Test bid after close (AIEX-728 failure path)**

1. Create a listing with closing time 10 seconds from now
2. Wait for it to close
3. Attempt to submit a bid
4. Expected: error "Auction has closed"

- [ ] **Step 8: Verify cancel guard now uses real bid count (AIEX-721 regression check)**

1. Create a fresh listing (zero bids)
2. Verify Cancel button is visible
3. Place a bid as another user
4. Sign back in as seller
5. Verify Cancel button is gone

- [ ] **Step 9: Final commit if any changes remain**

```bash
git status
# If any uncommitted changes:
git add .
git commit -m "feat(AIEX-727): complete sealed bidding epic"
```