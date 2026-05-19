# Losing Bidder Reveal Own Bid — Design Spec

**Jira:** AIEX-784  
**Date:** 2026-05-19  
**Branch:** feature/AIEX-784-losing-bidder-reveal-own-bid

## Summary

After a listing closes, authenticated past bidders see their own submitted amount alongside the winner's result. Winners see a personalised "You won!" view. Losers see their bid amount compared against the winner's. Non-bidders and unauthenticated users see the standard winner section unchanged. The reveal is lazy — computed on demand, no schema changes.

## Approach

Approach 1 (extend existing): Broaden the `ownBid`/`existingBid` condition to cover closed listings by introducing an `isPastBidder` flag. Reuses existing query patterns and mocks. Minimal diff.

## Architecture

**Affected files:**
- `app/api/listings/[id]/route.ts` — add `isPastBidder`, extend `ownBid` query condition
- `app/listings/[id]/page.tsx` — extend `existingBid` condition, add winner/loser/non-bidder branches in closed result section
- `__tests__/api/listings/listing-id.test.ts` — new test cases for closed + authenticated bidder scenarios

**No schema changes.** `Bid.bidderId` scalar is already returned by Prisma's `findFirst` alongside `include`, enabling identity checks without extra selects.

## API Route Changes

`app/api/listings/[id]/route.ts` — GET handler

**Add `isPastBidder` flag after the existing `isEligibleBidder`:**

```ts
const isPastBidder =
  !isOpen && !!session?.user?.id && session.user.id !== listing.sellerId
```

**Extend `ownBid` query condition in the `Promise.all`:**

```ts
// Before:
isEligibleBidder
  ? prisma.bid.findUnique(...)
  : Promise.resolve(null)

// After:
isEligibleBidder || isPastBidder
  ? prisma.bid.findUnique(...)
  : Promise.resolve(null)
```

**Response:** The existing `...(ownBid ? { myBid: ownBid.amount } : {})` spread is unchanged. It now also fires for closed listings where the viewer has a bid. No new response fields.

**Seller exclusion:** `isPastBidder` explicitly excludes the seller (`session.user.id !== listing.sellerId`). Sellers can never bid, so `ownBid` would be null anyway — the guard is for correctness.

## Page Changes

`app/listings/[id]/page.tsx`

**Extend `existingBid` condition to run for all authenticated non-sellers (open and closed):**

```ts
// Before:
isOpen && session?.user?.id
  ? prisma.bid.findUnique(...)
  : Promise.resolve(null)

// After:
session?.user?.id && session.user.id !== listing.sellerId
  ? prisma.bid.findUnique(...)
  : Promise.resolve(null)
```

**Extend the closed result section (`{!isOpen && ...}`) with viewer-aware branches:**

When `winnerBid` is non-null, check `winnerBid.bidderId === session?.user?.id`:

| Viewer | Display |
|---|---|
| Winner (`winnerBid.bidderId === session.user.id`) | Replace winner section: "You won!" + amount in amber |
| Past losing bidder (`existingBid` non-null, not winner) | Keep standard winner section + add "You bid $X" line below |
| Non-bidder or unauthenticated (`existingBid` null) | Standard winner section only (existing behaviour) |
| No bids (`!winnerBid`) | "No bids were placed." (existing behaviour) |

`winnerBid.bidderId` is available as a Prisma scalar field — no query change needed.

## Tests

File: `__tests__/api/listings/listing-id.test.ts`

New test cases using `mockClosedListing` and existing `mockBidFindFirst`/`mockBidFindUnique` mocks:

| Scenario | Setup | Expected |
|---|---|---|
| Closed + authenticated past bidder (non-winner) | Session user `"bidder-1"`, `findUnique` → `{ amount: 200 }`, `findFirst` → winner with `bidderId: "other"` | `myBid: 200`, `closed: true`, `winner: { winnerUsername, winningAmount }` |
| Closed + authenticated winner | Session user `"bidder-1"`, `findUnique` → `{ amount: 350 }`, `findFirst` → winner with `bidderId: "bidder-1"` | `myBid: 350`, `closed: true`, `winner: { winnerUsername: "alice", winningAmount: 350 }` |
| Closed + unauthenticated | No session, `findFirst` → winner | No `myBid`, `closed: true`, `winner` present |
| Closed + seller session | Session `"u1"` (= `mockListing.sellerId`), `findFirst` → winner | No `myBid` (seller excluded by `isPastBidder`) |

**Mock interaction:** For closed + bidder tests, both `mockBidFindFirst` (winner) and `mockBidFindUnique` (viewer's own bid) run. Both must be set up in each test.

Assert `mockBidFindUnique` was called for past-bidder tests and was NOT called for unauthenticated/seller tests.

## Edge Cases

- **Winner viewing closed listing:** `myBid` equals `winningAmount`; both present in response. Page shows "You won!" by detecting `winnerBid.bidderId === session.user.id`.
- **Past bidder who updated bid:** `findUnique` always returns the current `amount` (upsert updates in-place). No special handling.
- **Seller viewing closed listing:** `isPastBidder` false → `myBid` absent. Page `existingBid` condition also excludes seller. Standard winner section shown.
- **Unauthenticated viewer:** `isPastBidder` false → `myBid` absent. Standard winner section shown.
- **Zero-bid close:** `winnerBid` null → "No bids were placed." `existingBid` is also null (no bids exist). No conflict.
- **`canCancel` / open listing behaviour:** Unchanged.

## Acceptance Criteria

- [ ] Losing bidder sees their own bid amount alongside the winner's after close
- [ ] Winning bidder loading the closed page sees "You won!" with their amount
- [ ] Past bidder who updated their bid sees their final submitted amount
- [ ] Non-bidder (no bid placed) sees only winner info — no myBid field in response
