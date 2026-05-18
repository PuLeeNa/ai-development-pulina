Guide the full AI-SDLC cycle for this feature request: $ARGUMENTS

Walk through these steps IN ORDER, pausing for user input at each gate:

## Step 1 — Clarification
Ask 2-3 targeted questions to surface ambiguities. One question at a time. Focus on: who does what, edge cases, what is out of scope.

## Step 2 — User Stories
Write user stories in "As a / I want / So that" format with Acceptance Criteria. Show them to the user before proceeding.

## Step 3 — PO Review Gate
Present the stories. Ask: "Do these stories match what you need? Any changes?" Adjust and re-show if needed. Only proceed when user confirms.

## Step 4 — Jira
Once stories are approved, use `/embla-core:jira` to create them in Jira under the AIEX project. Show the created ticket keys.

## Step 5 — Brainstorm
Use `/superpowers:brainstorming` on the first story. Get implementation approach approved before any code.

## Step 6 — TDD (Tests First)
Write failing unit tests before any implementation code. Run them to confirm they fail.

## Step 7 — Code
Implement until tests pass. Follow project patterns in CLAUDE.md: dynamic imports, async params, direct Prisma in Server Components.

## Step 8 — QA
Run `/qa`. Fix any failures. Manual smoke test on the changed flow.

## Step 9 — PR & Review
Use `/superpowers:finishing-a-development-branch` to push and create a PR. Run AI code review.

## Step 10 — Deploy & Done
Verify Vercel auto-deployed. Transition the Jira ticket to Done.

---
Use Haiku model throughout (fast, sufficient for well-specified tasks).
