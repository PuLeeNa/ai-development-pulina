---
description: Run the full AI-SDLC cycle for a new feature request from a Product Owner
argument-hint: "<feature description from the PO>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Skill
model: haiku
---

# /new-feature — Full AI-SDLC Feature Cycle

Receives a Product Owner feature request via $ARGUMENTS and walks through the complete delivery cycle. Gate at each phase — do not proceed without user confirmation.

---

## Step 1 — Clarification
Ask 2–3 targeted questions about $ARGUMENTS. One at a time. Focus on: who does what, edge cases, what is explicitly out of scope.

---

## Step 2 — User Stories
Write user stories: "As a [role], I want [goal] so that [benefit]"
Include Acceptance Criteria for each. Present to user. Do not proceed until confirmed.

---

## Step 3 — Jira
Once stories are confirmed, use `/embla-core:jira` to create them in AIEX.
Print the created ticket keys.

---

## Step 4 — Brainstorm
Use `/superpowers:brainstorming` on the first story.
Get implementation approach approved before any code.

---

## Step 5 — TDD
Write failing unit tests first. Run them. Confirm they fail (red phase).

---

## Step 6 — Code
Implement until tests pass (green phase).
Read `.claude/lib/core/patterns.md` before writing any code.

---

## Step 7 — PR & Review
Use `/superpowers:finishing-a-development-branch`.
Run `/code-review:code-review` on the PR.

---

## Step 8 — Deploy & Done
Verify Vercel auto-deployed. Transition Jira ticket to Done.

---

## Step 9 — Tell the user
Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /new-feature complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature: $ARGUMENTS
Tickets: [AIEX-NNN list]
Branch:  [branch name]
PR:      [URL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
