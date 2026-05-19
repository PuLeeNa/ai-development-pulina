# AIEX-732: Update Bid Before Listing Closes

**Date:** 2026-05-19  
**Story:** As a bidder, I want to update my bid before the listing closes so that I can adjust my offer

---

## Summary

The backend is already fully implemented. `POST /api/listings/[id]/bid` uses `prisma.bid.upsert()` which creates a new bid or updates the `amount` on an existing one. The `createdAt` field is preserved automatically — the update clause only sets `amount`. The `BidForm` component already pre-fills the existing bid amount and shows "Update bid" on the submit button.

The remaining work is: two new test cases covering the update path explicitly, and a transient success message in `BidForm`.

---

## Architecture

**No API changes. No schema changes.**

The `Bid` model has `@@unique([listingId, bidderId])` — one bid per bidder per listing. The upsert key is `listingId_bidderId`. On update, only `amount` is written; `createdAt` is untouched.

All existing guards apply equally to updates:
- Listing must be open (`closingTime > now` and `cancelled = false`) → 403
- Bidder must not be the seller → 403
- Amount must be ≥ `startingPrice` → 400

---

## Files Changed

| File | Change |
|---|---|
| `__tests__/api/listings/bid.test.ts` | Add 2 new test cases |
| `app/components/BidForm.tsx` | Add `success` state + transient confirmation message |

---

## Test Additions

Both added to the existing `describe("POST /api/listings/[id]/bid")` block.

**1. Update path — upsert payload check**
- Setup: authenticated bidder, open listing, valid amount (200)
- Assert: `mockUpsert` called with `update: { amount: 200 }` (no `createdAt` in update clause)
- Assert: response status 201

**2. Same amount resubmission**
- Setup: authenticated bidder, open listing, amount equal to existing bid
- Assert: upsert still called (no error thrown, no duplicate)
- Assert: response status 201

*The "update after close → 403" scenario is already covered by the existing `"returns 403 when listing closingTime has passed"` test.*

---

## BidForm UI Change

Add a `success` state (`useState<string | null>(null)`) to `BidForm`.

On successful POST:
1. Set `success` to `"Bid updated!"` (if `existingBid` was set) or `"Bid placed!"` (first bid)
2. Call `router.refresh()`
3. Clear `success` after 2 seconds via `setTimeout`

Render below the input row, same slot as the error message:

```tsx
{success && (
  <p role="status" className="text-green-400 bg-green-400/10 rounded-lg px-4 py-3 text-sm">
    {success}
  </p>
)}
```

The button label (`"Place bid"` / `"Update bid"`) already toggles on `existingBid` — no change needed.

---

## Error Handling

No changes to error handling. All existing error paths (401, 400, 403, 404) remain unchanged and are already tested.

---

## Out of Scope

- Displaying the bidder's current bid amount on the listing page after close (AIEX-784)
- Showing bidder count to other users (AIEX-734)
- Any notification to the seller when a bid is updated
