# AIEX-734: Sealed Bid — Bidder Count on Open Listing

**Date:** 2026-05-19  
**Story:** As a bidder, I want to see only the bidder count on an open listing so that the auction stays sealed.

---

## Context

The sealed-bid trust mechanism requires that bid amounts are never exposed while a listing is open. Only the count of distinct bidders is revealed publicly. A bidder may see their own amount; no one else's.

The existing `GET /api/listings/[id]` returns a `bidCount` field with no session awareness — the same response is returned to everyone. This story fixes that by making the endpoint session-aware and enforcing the seal at the API layer.

---

## API: `GET /api/listings/[id]`

### Changes

- **Rename** `bidCount` → `bidderCount` in the response (breaking rename; tests updated).
- **Add session check** inside the handler using `await import("@/lib/auth")` (consistent with DELETE handler convention).
- **Conditional `myBid`**: included only when all four conditions hold:
  1. Listing is open (`closingTime > now`)
  2. Caller is authenticated
  3. Caller is not the seller
  4. Caller has an existing bid on this listing

### Response Shape

```ts
// All callers on an open listing
{
  ...listingFields,
  bidderCount: number
}

// Authenticated bidder with an existing bid on an open listing
{
  ...listingFields,
  bidderCount: number,
  myBid: number
}
```

`myBid` is **never present** for: the seller, unauthenticated users, bidders with no bid, or closed listings. Closed-listing result revelation is out of scope (AIEX-762).

### Implementation Notes

- Session resolved via `getServerSession(authOptions)` — same pattern as DELETE.
- Bid count via `prisma.bid.count({ where: { listingId: id } })` — count equals bidder count due to `@@unique([listingId, bidderId])`.
- Own-bid lookup via `prisma.bid.findUnique({ where: { listingId_bidderId: { listingId, bidderId } }, select: { amount: true } })`.
- Both Prisma queries run in parallel via `Promise.all` when the caller is an eligible bidder.

---

## Page: `app/listings/[id]/page.tsx`

The page is a server component that queries Prisma directly (no API call). Three changes:

1. **Rename** local variable `bidCount` → `bidderCount`.
2. **Display bidder count** in the info row (alongside Starting price / Listed by) when the listing is open.
3. **Show own bid label** above `BidForm` when the bidder has an existing bid: "Your current bid: $X". The `BidForm` already pre-fills the input via `existingBid` — the label makes it explicitly visible.

No new components required.

---

## Edge Cases

| Scenario | `myBid` in response? |
|---|---|
| Unauthenticated caller | No |
| Authenticated seller (own listing) | No |
| Authenticated bidder, no bid placed | No |
| Authenticated bidder, bid exists, listing open | Yes |
| Listing closed | No (out of scope — AIEX-762) |

---

## `GET /api/listings/[id]/bids` — 404 by Design

No route file exists at this path. Next.js returns 404 naturally. This is intentional — no endpoint to enumerate all bids on an open listing exists by design. Verified by absence of the file; no unit test required (routing behaviour, not application logic).

---

## Tests

**File:** `__tests__/api/listings/listing-id.test.ts`

Existing GET tests updated:
- All `bidCount` assertions renamed to `bidderCount`.

New GET test cases:
1. Unauthenticated caller — returns `bidderCount`, no `myBid` field.
2. Authenticated seller viewing own listing — returns `bidderCount`, no `myBid` field.
3. Authenticated bidder with existing bid — returns `bidderCount` **and** `myBid`.
4. Authenticated bidder with no bid — returns `bidderCount`, no `myBid` field.

Mocks required: `getServerSession`, `prisma.listing.findUnique`, `prisma.bid.count`, `prisma.bid.findUnique`.

---

## Out of Scope

- Closed listing result revelation (winner + winning amount) — AIEX-762.
- Losing bidder's own bid shown after close — AIEX-784.
- Any changes to `POST /api/listings/[id]/bid`.
