---
description: Run full quality check — TypeScript, tests, and manual smoke test checklist
argument-hint: "(no arguments)"
allowed-tools: Bash, Read
model: claude-haiku-4-5-20251001
---

# /qa — Quality Check

Runs automated checks and prints a manual smoke test checklist.

---

## Step 1 — TypeScript
Run: `npx tsc --noEmit`
If errors: print them and stop. Do not continue.

---

## Step 2 — Unit Tests
Run: `npm test`
If failures: print them and stop. Do not continue.

---

## Step 3 — Print checklist (only if both above passed)
Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TypeScript: PASS
✅ Tests: PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANUAL SMOKE TEST
[ ] /listings loads — shows listings or empty state
[ ] /listings/new redirects to signin when not signed in
[ ] /auth/signup — register new user, redirects to /listings
[ ] /auth/signin — sign in, navbar shows Hi username
[ ] Create listing — form submits, redirects to /listings/[id]
[ ] Listing detail — photo, title, price, countdown, bidder count
[ ] Sign out — navbar reverts to Sign In / Get Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
