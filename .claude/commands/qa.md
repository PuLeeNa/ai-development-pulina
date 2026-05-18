Run full quality check for Sneaker Drop.

Steps:
1. Run `npx tsc --noEmit` and report any TypeScript errors
2. Run `npm test` and report pass/fail count
3. If both pass, print this manual smoke test checklist:

```
MANUAL SMOKE TEST CHECKLIST
────────────────────────────
[ ] /listings loads — shows listings or "No listings yet"
[ ] /listings/new redirects to /auth/signin when not signed in
[ ] /auth/signup — register a new user, verify redirects to /listings
[ ] /auth/signin — sign in with existing user, navbar shows "Hi, username"
[ ] Create a listing — fills form, submits, redirects to /listings/[id]
[ ] Listing detail — shows photo, title, price, countdown, bidder count
[ ] Sign out — navbar reverts to Sign In / Get Started
────────────────────────────
```

If any automated check fails, show the errors clearly and stop — do not print the checklist.
