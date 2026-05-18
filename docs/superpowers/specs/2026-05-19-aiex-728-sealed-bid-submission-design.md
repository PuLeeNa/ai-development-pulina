# AIEX-728 — Submit a Sealed Bid: Design Spec

**Date:** 2026-05-19  
**Story:** [AIEX-728](https://emblaftdev.atlassian.net/browse/AIEX-728)  
**Epic:** AIEX-727 — Sealed Bidding  
**Complexity:** Complex

---

## Overview

Authenticated non-seller users can place or update a sealed bid on any open listing. The bid amount must meet the starting price. No bid amounts are revealed to other parties. The seller cannot bid on their own listing.

---

## Data Model

Add `Bid` model to `prisma/schema.prisma`:

```prisma
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

- `Listing` and `User` each receive a `bids Bid[]` back-relation
- `@@unique([listingId, bidderId])` enforces one bid per bidder per listing; the upsert targets this constraint
- `createdAt` is set once at insert; `updatedAt` tracks subsequent updates — updating a bid does not reset `createdAt`

Migration: `npx prisma migrate dev --name add-bid-model`

---

## API Route

**File:** `app/api/listings/[id]/bid/route.ts`  
**Endpoint:** `POST /api/listings/[id]/bid`  
**Request body:** `{ amount: number }`

### Validation order

1. `401` — no session
2. `404` — listing not found
3. `403 "Auction has closed"` — listing cancelled or `closingTime <= now`
4. `403 "You cannot bid on your own listing"` — `session.user.id === listing.sellerId`
5. `400 "Bid must meet the starting price"` — `amount < listing.startingPrice`
6. `400 "Invalid amount"` — non-numeric or missing amount

### Upsert logic

```ts
await prisma.bid.upsert({
  where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
  create: { listingId: id, bidderId: session.user.id, amount },
  update: { amount },
})
```

### Response

`201` — `{ bidderCount: number }` (count of distinct bidders on this listing via `prisma.bid.count({ where: { listingId: id } })`)

---

## UI Component

**File:** `app/components/BidForm.tsx` (`"use client"`)

### Props

```ts
{
  listingId: string
  startingPrice: number
  existingBid?: number
}
```

### Behaviour

- Input pre-filled with `existingBid` if the user has already bid
- On submit: `fetch` POST to `/api/listings/${listingId}/bid` with `{ amount }`
- On success: `router.refresh()` — page re-renders with fresh Prisma data
- On error: display the API error message inline below the form
- Submit button disabled while request is in-flight

### Page integration (`app/listings/[id]/page.tsx`)

Server component fetches user's existing bid alongside the listing:

```ts
const existingBid = session?.user?.id
  ? await prisma.bid.findUnique({
      where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
      select: { amount: true },
    })
  : null
```

`BidForm` is rendered below listing details, visible only when `!isSeller && isOpen && session`. The cancel section is unaffected.

---

## Error Handling

| Scenario | Layer | Response |
|---|---|---|
| No session | API | `401 Unauthorized` |
| Listing not found | API | `404 Not found` |
| Listing closed/cancelled | API | `403 "Auction has closed"` |
| Seller bids on own listing | API | `403 "You cannot bid on your own listing"` |
| Amount below starting price | API | `400 "Bid must meet the starting price"` |
| Non-numeric/missing amount | API | `400 "Invalid amount"` |
| Network/unexpected error | BidForm client | `"Something went wrong"` inline |

All API error messages are user-readable and surfaced as-is in the form. No mapping layer needed.

---

## Testing

**File:** `__tests__/api/listings/bid.test.ts`

Pattern: Jest + mocked Prisma + mocked NextAuth (consistent with existing tests).

**Mocks required:** `prisma.listing.findUnique`, `prisma.bid.upsert`, `prisma.bid.count`, `getServerSession`

| Scenario | Expected |
|---|---|
| No session | `401` |
| Listing not found | `404` |
| Listing closed (`closingTime` in past) | `403 "Auction has closed"` |
| Listing cancelled | `403 "Auction has closed"` |
| Seller bids on own listing | `403 "You cannot bid on your own listing"` |
| Amount below `startingPrice` | `400 "Bid must meet the starting price"` |
| Valid first bid | `201` + `{ bidderCount: 1 }` |
| Valid upsert (same bidder bids again) | `201` + `{ bidderCount: 1 }` |

No component tests — API route tests only.

---

## Implementation Order

1. **AIEX-729** — Add `Bid` model to schema + run migration
2. **AIEX-730** — Implement `POST /api/listings/[id]/bid` route + tests
3. **AIEX-731** — Add `BidForm` component + integrate into listing detail page
