---
description: Run TypeScript check and Jest tests, then explain any failures in plain English with suggested fixes
allowed-tools: Bash
---

# /check — TypeScript + Test Health Check

Run the full type check and test suite, then summarise the results in plain English.

## Steps

1. **Run checks in parallel:**
   - `npx tsc --noEmit`
   - `npm run test`

2. **Report results:**
   - If everything passes: print one line — `✅ TypeScript clean. All tests passing.`
   - If TypeScript errors: list each file, the line, and what's wrong in plain English (not raw tsc output)
   - If test failures: list which tests failed, why they failed, and what the assertion mismatch means
   - For each failure, suggest the most likely fix in one sentence
