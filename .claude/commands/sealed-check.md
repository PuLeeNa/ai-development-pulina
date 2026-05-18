Verify that the sealed-bid rules are correctly enforced across the codebase.

Check each of these and report PASS or FAIL with file:line evidence:

1. **No /bids endpoint exists**
   - Confirm there is NO file at `app/api/listings/[id]/bids/route.ts`
   - PASS = file does not exist

2. **GET /api/listings/[id] never returns bid amounts while open**
   - Read `app/api/listings/[id]/route.ts`
   - Confirm the response includes `bidderCount` (always) and `myBid` (conditional, viewer's own only)
   - Confirm there is NO field that would expose other users' amounts

3. **Seller cannot bid**
   - Read `app/api/listings/[id]/bid/route.ts` if it exists
   - Confirm there is a guard: `if (listing.sellerId === session.user.id)` → 403

4. **Bid form not shown to seller**
   - Read `app/listings/[id]/page.tsx`
   - Confirm `BidForm` is only rendered when `!isSeller`

5. **Closed listing rejects bids**
   - In `app/api/listings/[id]/bid/route.ts`, confirm `closingTime <= now()` → 403

Print a summary table of all checks with PASS/FAIL status.
