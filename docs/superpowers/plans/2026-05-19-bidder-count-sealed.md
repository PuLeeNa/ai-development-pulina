# AIEX-734: Sealed Bid — Bidder Count on Open Listing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `GET /api/listings/[id]` session-aware so it returns `bidderCount` to all callers and `myBid` only to authenticated bidders with an existing bid on open listings; update the listing detail page to display these values.

**Architecture:** Extend the existing GET route handler to resolve session and run conditional Prisma queries in parallel; rename `bidCount` → `bidderCount` throughout; add a "Bidders" stat and "Your current bid" label to the listing detail page using direct Prisma queries (server component pattern already in use).

**Tech Stack:** Next.js 16 App Router, NextAuth v4 (`getServerSession`), Prisma 7 + adapter-pg, Jest

---

## File Map

| Action | File | Change |
|---|---|---|
| Modify | `app/api/listings/[id]/route.ts` | GET: add session + bid queries, return `bidderCount` + optional `myBid` |
| Modify | `__tests__/api/listings/listing-id.test.ts` | Add `bid.findUnique` mock; update existing GET tests; add 4 new session-aware GET tests |
| Modify | `app/listings/[id]/page.tsx` | Rename `bidCount`→`bidderCount`; display bidder count stat; show own-bid label |

---

## Task 1: Update tests — failing first

**Files:**
- Modify: `__tests__/api/listings/listing-id.test.ts`

- [ ] **Step 1: Add `mockBidFindUnique` and update the prisma mock**

At the top of the file, add `mockBidFindUnique` and extend the prisma mock to include `bid.findUnique`:

```typescript
// Line 5-7 — change from:
const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockCount = jest.fn()

// To:
const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockCount = jest.fn()
const mockBidFindUnique = jest.fn()
```

```typescript
// jest.mock("@/lib/prisma", ...) — change from:
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

// To:
jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    bid: {
      count: mockCount,
      findUnique: mockBidFindUnique,
    },
  },
}))
```

- [ ] **Step 2: Update the existing GET describe block**

Replace the entire `describe("GET /api/listings/[id]", ...)` block with the following. Key changes:
- `beforeEach` now seeds `mockGetServerSession` to `null` (GET handler will call it)
- `mockFindUnique` values no longer need `_count` (listing query drops `_count` include)
- `mockCount.mockResolvedValue(N)` added alongside each GET test (bidderCount now comes from `bid.count()`)
- `data.bidCount` assertions renamed to `data.bidderCount`

```typescript
describe("GET /api/listings/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(null)
  })

  it("returns 404 when listing not found", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(404)
  })

  it("returns listing with seller.username and bidderCount 0", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(0)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe("Air Max")
    expect(data.seller.username).toBe("seller1")
    expect(data.bidderCount).toBe(0)
    expect(data._count).toBeUndefined()
  })

  it("returns correct bidderCount when bids exist", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(3)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(3)
    expect(data._count).toBeUndefined()
  })

  it("unauthenticated caller gets bidderCount only, no myBid", async () => {
    mockGetServerSession.mockResolvedValue(null)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(2)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(2)
    expect(data.myBid).toBeUndefined()
  })

  it("authenticated seller gets bidderCount only, no myBid", async () => {
    // mockListing.sellerId === "u1" — same id as session user
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(3)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(3)
    expect(data.myBid).toBeUndefined()
  })

  it("authenticated bidder with existing bid gets bidderCount and myBid", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(1)
    mockBidFindUnique.mockResolvedValue({ amount: 250 })
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(1)
    expect(data.myBid).toBe(250)
  })

  it("authenticated bidder with no bid gets bidderCount only, no myBid", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(0)
    mockBidFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(0)
    expect(data.myBid).toBeUndefined()
  })
})
```

`mockListing.sellerId` is `"u1"` (defined in the existing `mockListing` constant). The "authenticated seller" test sets `session.user.id = "u1"` — matching the seller — so `myBid` is correctly excluded.

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd "C:/projects/claudeproject/ai-development-pulina/.worktrees/AIEX-734"
npm test -- --no-coverage --testPathPattern="listing-id"
```

Expected: FAIL. The existing GET tests fail because the handler still returns `bidCount` (not `bidderCount`). The 4 new session-aware tests fail because the handler doesn't yet check session or call `bid.findUnique`.

---

## Task 2: Implement session-aware GET handler

**Files:**
- Modify: `app/api/listings/[id]/route.ts`

- [ ] **Step 1: Replace the GET function**

Replace the entire `GET` function (lines 5–24) in `app/api/listings/[id]/route.ts` with:

```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { prisma } = await import("@/lib/prisma")
  const { authOptions } = await import("@/lib/auth")

  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { username: true } } },
    }),
    getServerSession(authOptions),
  ])

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOpen = new Date(listing.closingTime) > new Date()
  const isEligibleBidder =
    isOpen && !!session?.user?.id && session.user.id !== listing.sellerId

  const [bidderCount, ownBid] = await Promise.all([
    prisma.bid.count({ where: { listingId: id } }),
    isEligibleBidder
      ? prisma.bid.findUnique({
          where: { listingId_bidderId: { listingId: id, bidderId: session!.user!.id! } },
          select: { amount: true },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json({
    ...listing,
    bidderCount,
    ...(isEligibleBidder && ownBid ? { myBid: ownBid.amount } : {}),
  })
}
```

The top-level `import { getServerSession } from "next-auth"` already exists in the file — no new import needed.

- [ ] **Step 2: Run GET tests — verify they pass**

```bash
cd "C:/projects/claudeproject/ai-development-pulina/.worktrees/AIEX-734"
npm test -- --no-coverage --testPathPattern="listing-id"
```

Expected output:
```
PASS  __tests__/api/listings/listing-id.test.ts
  GET /api/listings/[id]
    ✓ returns 404 when listing not found
    ✓ returns listing with seller.username and bidderCount 0
    ✓ returns correct bidderCount when bids exist
    ✓ unauthenticated caller gets bidderCount only, no myBid
    ✓ authenticated seller gets bidderCount only, no myBid
    ✓ authenticated bidder with existing bid gets bidderCount and myBid
    ✓ authenticated bidder with no bid gets bidderCount only, no myBid
  DELETE /api/listings/[id]
    ✓ returns 401 when not authenticated
    ✓ returns 403 when non-seller attempts to cancel
    ✓ cancels listing and returns 200 when seller with zero bids
    ✓ returns 403 when seller tries to cancel listing with bids
```

- [ ] **Step 3: Run the full test suite — verify no regressions**

```bash
cd "C:/projects/claudeproject/ai-development-pulina/.worktrees/AIEX-734"
npm test -- --no-coverage
```

Expected: All test suites pass. Total tests increases from 30 to 34 (4 new GET cases).

- [ ] **Step 4: Commit**

```bash
cd "C:/projects/claudeproject/ai-development-pulina/.worktrees/AIEX-734"
git add "app/api/listings/[id]/route.ts" "__tests__/api/listings/listing-id.test.ts"
git commit -m "feat(AIEX-734): make GET /api/listings/[id] session-aware, return bidderCount and myBid"
```

---

## Task 3: Update listing detail page

**Files:**
- Modify: `app/listings/[id]/page.tsx`

> This file is `.tsx`. Per project conventions in CLAUDE.md, invoke the `ui-style` skill before making UI edits to stay consistent with the design system.

- [ ] **Step 1: Rename `bidCount` → `bidderCount`**

In `app/listings/[id]/page.tsx`, change line 34 and line 44:

```typescript
// Change from:
const [existingBid, bidCount] = await Promise.all([
  ...
])
const canCancel = isSeller && bidCount === 0 && isOpen

// To:
const [existingBid, bidderCount] = await Promise.all([
  ...
])
const canCancel = isSeller && bidderCount === 0 && isOpen
```

The Prisma queries inside `Promise.all` are unchanged — only the destructured variable name changes.

- [ ] **Step 2: Add "Bidders" stat to the info row**

In the info row (lines 70–80), add a third stat block after "Listed by":

```tsx
{/* Change from: */}
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

{/* To: */}
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
      <p className="text-white font-medium">{bidderCount}</p>
    </div>
  )}
</div>
```

- [ ] **Step 3: Add "Your current bid" label above BidForm**

Change the BidForm section (lines 86–94):

```tsx
{/* Change from: */}
{!isSeller && isOpen && session && (
  <div className="pt-4 border-t border-zinc-800">
    <BidForm
      listingId={listing.id}
      startingPrice={listing.startingPrice}
      existingBid={existingBid?.amount}
    />
  </div>
)}

{/* To: */}
{!isSeller && isOpen && session && (
  <div className="pt-4 border-t border-zinc-800">
    {existingBid && (
      <p className="text-zinc-400 text-sm mb-3">
        Your current bid:{" "}
        <span className="text-amber-400 font-semibold">
          ${existingBid.amount.toLocaleString()}
        </span>
      </p>
    )}
    <BidForm
      listingId={listing.id}
      startingPrice={listing.startingPrice}
      existingBid={existingBid?.amount}
    />
  </div>
)}
```

`existingBid` is typed as `{ amount: number } | null` from the Prisma query — `existingBid.amount` is safe inside the `{existingBid && ...}` guard.

- [ ] **Step 4: Run full test suite**

```bash
cd "C:/projects/claudeproject/ai-development-pulina/.worktrees/AIEX-734"
npm test -- --no-coverage
```

Expected:
```
Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total
```

- [ ] **Step 5: Commit**

```bash
cd "C:/projects/claudeproject/ai-development-pulina/.worktrees/AIEX-734"
git add "app/listings/[id]/page.tsx"
git commit -m "feat(AIEX-734): display bidder count and own-bid label on listing detail page"
```
