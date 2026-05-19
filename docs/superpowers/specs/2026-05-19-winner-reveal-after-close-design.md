# Winner Reveal After Close — Design Spec

**Jira:** AIEX-762  
**Date:** 2026-05-19  
**Branch:** feature/AIEX-762-reveal-winner-after-close

## Summary

Once a listing's `closingTime` passes, any user loading the listing detail page sees the winner's username and winning amount. If no bids were placed, they see "No bids were placed." The reveal is lazy — computed on demand from the DB on each request, not persisted or triggered by a background job.

## Approach

Approach 1 (minimal): Update the API route and the page server component independently. Both add a conditional `findFirst` winner query when the listing is closed. No schema changes. No new endpoints.

## Architecture

**Affected files:**
- `app/api/listings/[id]/route.ts` — GET handler gains winner query + response fields
- `app/listings/[id]/page.tsx` — page gains winner query + closed result UI section
- `__tests__/api/listings/listing-id.test.ts` — new closed-listing test cases

**No schema changes.** The `Bid` model already has `amount`, `createdAt`, and a `bidder` relation with `username`.

## API Route Changes

`GET /api/listings/[id]`

When `!isOpen` (i.e. `listing.closingTime <= now`):

1. Run winner query in the parallel `Promise.all`:
   ```ts
   prisma.bid.findFirst({
     where: { listingId: id },
     orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
     include: { bidder: { select: { username: true } } },
   })
   ```
2. Skip `ownBid` query (`isEligibleBidder` already requires `isOpen`, so it resolves to null naturally).
3. Include in response:
   ```json
   { "closed": true, "winner": { "winnerUsername": "alice", "winningAmount": 350 } }
   // or when no bids:
   { "closed": true, "winner": null }
   ```

Open listings: `closed` and `winner` fields are absent — no breaking change for existing callers.

**Tie-break rule:** `orderBy: [{ amount: "desc" }, { createdAt: "asc" }]` — equal highest amounts resolve to the earlier submission. Handled entirely by DB ordering; no application logic.

## Page Changes

`app/listings/[id]/page.tsx`

Extend the existing `Promise.all` to conditionally run the winner query:

```ts
const [existingBid, bidderCount, winnerBid] = await Promise.all([
  isOpen && session?.user?.id
    ? prisma.bid.findUnique({ where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } }, select: { amount: true } })
    : Promise.resolve(null),
  prisma.bid.count({ where: { listingId: id } }),
  !isOpen
    ? prisma.bid.findFirst({
        where: { listingId: id },
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        include: { bidder: { select: { username: true } } },
      })
    : Promise.resolve(null),
])
```

**JSX additions** — in place of the bid form section, render the closed result:

- `!isOpen && winnerBid` → winner banner: winner's username and winning amount in amber, styled prominently. Visible to all users including the seller.
- `!isOpen && !winnerBid` → muted "No bids were placed" message.
- `BidForm` and cancel button already gated on `isOpen` / `canCancel` — no changes needed there.
- `bidderCount` stat remains hidden when `!isOpen` (existing behaviour, story does not call for showing it post-close).

## Tests

File: `__tests__/api/listings/listing-id.test.ts`

Add `mockBidFindFirst` mock alongside existing `mockBidFindUnique`.

New test cases in `GET /api/listings/[id]`:

| Scenario | Setup | Expected |
|---|---|---|
| Closed listing with winner | `closingTime` in past, `findFirst` → `{ amount: 350, bidder: { username: "alice" } }` | `closed: true, winner: { winnerUsername: "alice", winningAmount: 350 }` |
| Closed listing no bids | `closingTime` in past, `findFirst` → null | `closed: true, winner: null` |
| Open listing unchanged | `closingTime` in future | `closed` and `winner` absent from response |

Tie-break ordering is tested by asserting `findFirst` is called with the correct `orderBy` args — no need to simulate DB sorting in unit tests.

## Edge Cases

- **Cancelled listings:** page already redirects away; API doesn't gate on `cancelled` but a cancelled listing always has zero bids (DELETE prevents cancellation with bids), so winner will be null.
- **`myBid` on closed listings:** `isEligibleBidder` requires `isOpen`, so `ownBid` query is skipped post-close and `myBid` is absent from the closed response.
- **Concurrent requests after close:** winner is recomputed each time from DB — no race conditions, no writes.

## Acceptance Criteria

- [ ] Closed listing with bids displays winner username and winning amount to all users
- [ ] Two equal highest bids — earlier `createdAt` wins
- [ ] Seller viewing their own closed listing sees the same winner info as everyone else
- [ ] Listing closed with zero bids shows "No bids were placed" with no winner info
