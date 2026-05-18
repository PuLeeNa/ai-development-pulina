# AIEX-727: Sealed Bidding — Implementation Spec

**Date:** 2026-05-12
**Jira:** AIEX-727 (Epic) — covers AIEX-728, AIEX-732, AIEX-734
**Stack:** Next.js 16 (App Router, TypeScript), Prisma v7 + adapter-pg, Supabase Postgres, NextAuth v4, Tailwind CSS v4

---

## Approach

Server Component fetches `myBid` (bidder's existing bid amount) and `bidderCount` directly from Prisma alongside the listing. Both are passed as props to a `"use client"` `BidForm` island. After a successful bid submission, `router.refresh()` re-runs the Server Component to update `myBid` without a full navigation. All seal enforcement lives in the API route — the page only renders what the API allows.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add Bid model + User.bids + Listing.bids |
| `app/api/listings/[id]/bid/route.ts` | Create | POST — place or update bid |
| `app/api/listings/[id]/route.ts` | Modify | GET — add real bidderCount + myBid (seal rules) |
| `app/listings/[id]/page.tsx` | Modify | Add bidderCount display, BidForm, fix canCancel |
| `app/components/BidForm.tsx` | Create | Bid submission form ("use client") |

---

## Data Model

```prisma
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

**Key decisions:**
- `@@unique([listingId, bidderId])` — DB-enforced one-bid-per-bidder; Prisma upsert targets this constraint
- `createdAt` is set once at first submission and **never updated** — used for tie-breaking (earlier first-submission wins)
- `updatedAt` stamps every update — audit only, not used for business logic

Migration: `npx prisma migrate dev --name add-bid`

---

## API Routes

### `POST /api/listings/[id]/bid` — new file

Guards (evaluated in order):

| Check | Response |
|---|---|
| No session | `401 { error: "Unauthorized" }` |
| Listing not found | `404 { error: "Not found" }` |
| Viewer is the seller | `403 { error: "You cannot bid on your own listing" }` |
| `closingTime <= now()` | `403 { error: "Auction has closed" }` |
| `amount < startingPrice` | `400 { error: "Bid must meet the starting price" }` |

On valid input — Prisma upsert on `@@unique([listingId, bidderId])`:
- **Create path:** sets `amount`; `createdAt` and `updatedAt` auto-set
- **Update path:** sets `amount` and `updatedAt` only — `createdAt` is NOT touched (preserves tie-break order)

Returns:
- `201 { bidderCount }` on first bid (create)
- `200 { bidderCount }` on update

`bidderCount` is computed as `prisma.bid.count({ where: { listingId: id } })` after the upsert.

---

### `GET /api/listings/[id]` — updated seal rules

The existing route is updated to replace the hardcoded `bidCount: 0` with real data and add `myBid`.

**Query additions:**
```ts
const bidderCount = await prisma.bid.count({ where: { listingId: id } })

const myBid = (session?.user?.id && session.user.id !== listing.sellerId)
  ? (await prisma.bid.findUnique({
      where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
      select: { amount: true },
    }))?.amount ?? null
  : null
```

**Response shape:**
```ts
{
  ...listing,          // all listing fields
  bidderCount,         // always included
  myBid,               // number | null — null for seller and non-bidders
}
```

**Seal rule:** `myBid` is `null` for the seller and for authenticated users who have not bid. It is **never** the highest bid or any other user's bid — only the viewer's own amount.

**No `GET /api/listings/[id]/bids` endpoint exists** — any request to that path returns 404 by design.

---

## Components

### `app/components/BidForm.tsx`

```
"use client"

Props:
  listingId:     string
  startingPrice: number
  myBid:         number | null

State:
  error:   string | null
  loading: boolean

handleSubmit(e):
  e.preventDefault()
  setError(null), setLoading(true)
  POST /api/listings/[listingId]/bid { amount: Number(input) }
  if ok → router.refresh()          ← re-runs Server Component, updates myBid
  if error → setError(data.error)
  setLoading(false)

JSX:
  Heading: "Your bid" if myBid, else "Place your bid"
  Number input:
    - defaultValue={myBid ?? ""}
    - min={startingPrice}
    - required
    - dark input style (zinc-800 bg, amber-400 focus ring)
  Hint: "Minimum $startingPrice"  (text-zinc-500, text-xs)
  Submit button:
    - "Update bid" if myBid, else "Place bid"
    - amber button, disabled while loading
  Error block: text-red-400, bg-red-400/10 (shown when error !== null)
```

---

## Updated `app/listings/[id]/page.tsx`

New queries added to the existing `Promise.all`:

```ts
const [listing, session, bidderCount, myBidRecord] = await Promise.all([
  prisma.listing.findUnique({ where: { id }, include: { seller: { select: { username: true } } } }),
  getServerSession(authOptions),
  prisma.bid.count({ where: { listingId: id } }),
  // myBid fetched after session is known — handled sequentially below
])
```

Since `myBid` depends on `session`, it is fetched after:
```ts
const isNonSellerBidder = session?.user?.id && session.user.id !== listing.sellerId
const myBid = isNonSellerBidder
  ? (await prisma.bid.findUnique({
      where: { listingId_bidderId: { listingId: id, bidderId: session.user.id! } },
      select: { amount: true },
    }))?.amount ?? null
  : null
```

**`canCancel` fix** — uses real `bidderCount` instead of hardcoded `0`:
```ts
const canCancel = isSeller && bidderCount === 0 && isOpen
```

**Bidder count display** (open listing, below countdown timer area):
```tsx
<p className="text-zinc-400 text-sm">
  {bidderCount} {bidderCount === 1 ? "bidder" : "bidders"} so far
</p>
```

**BidForm** (open listing, authenticated non-seller only):
```tsx
{isOpen && isNonSellerBidder && (
  <BidForm
    key={myBid ?? "new"}
    listingId={listing.id}
    startingPrice={listing.startingPrice}
    myBid={myBid}
  />
)}
{/* key forces remount after router.refresh() so defaultValue picks up new myBid */}
```

---

## Acceptance Criteria

**AIEX-728 (Submit bid):**
- Valid amount ≥ startingPrice, open listing, non-seller → Bid created, bidderCount increments
- Seller bid → 403 "You cannot bid on your own listing"
- Closed listing → 403 "Auction has closed"
- Amount < startingPrice → 400 "Bid must meet the starting price"
- Unauthenticated → 401

**AIEX-732 (Update bid):**
- Bidder submits new amount → amount updated, `createdAt` unchanged
- After close → 403 "Auction has closed"
- Under startingPrice → 400 "Bid must meet the starting price"

**AIEX-734 (Sealed display):**
- Open listing → bidderCount shown, no amounts visible
- Authenticated bidder with existing bid → also sees own amount in form (pre-filled)
- Seller viewing own open listing → bidderCount only, no BidForm, no amounts
- GET /api/listings/[id]/bids → 404 (route does not exist)

---

## Out of Scope

- Proxy / automatic bidding
- Bid retraction (bidder cannot remove a bid, only update amount)
- Bid history visible to user