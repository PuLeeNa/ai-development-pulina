---
description: Run the full AI-SDLC cycle for a new feature request from a Product Owner
argument-hint: "<feature description from the PO>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Skill
model: claude-haiku-4-5-20251001
---

# /new-feature — Full AI-SDLC Feature Cycle

Receives a Product Owner feature request via $ARGUMENTS and walks through the complete delivery cycle. Gate at each phase — do not proceed without user confirmation.

---

## Step 1 — Clarification
Ask 2–3 targeted questions about the request. One at a time. Focus on: who does what, edge cases, what is explicitly out of scope.

---

## Step 2 — User Stories
Write user stories: "As a [role], I want [goal] so that [benefit]"
Include Acceptance Criteria for each. Present to the user. Do not proceed until confirmed.

---

## Step 3 — Jira
Once stories are confirmed, use `/embla-core:jira` to create them in the AIEX project.
Read `.claude/config/jira-board.json` for project key and transition IDs.
Print the created ticket keys.

---

## Step 4 — Brainstorm
Invoke `Skill(skill: "superpowers:brainstorming")` on the first story.
Get implementation approach approved before writing any code.

---

## Step 5 — TDD
Write failing unit tests first. Run them. Confirm they fail (red phase).

---

## Step 6 — Code
Implement until tests pass (green phase).
Read `.claude/lib/core/patterns.md` before writing any code.

---

## Step 7 — QA
Run `/qa`. Fix any failures. Manual smoke test on the changed flow.

---

## Step 8 — PR & Review
Invoke `Skill(skill: "superpowers:finishing-a-development-branch")`.
Run `/commit` then open PR.

---

## Step 9 — Deploy & Done
Verify Vercel auto-deployed. Transition Jira ticket to Done.
Read `.claude/config/jira-board.json` for the Done transition ID.

---

## Step 10 — Tell the user
Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ /new-feature complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature: $ARGUMENTS
Tickets: [list AIEX-NNN keys]
Branch:  [branch name]
PR:      [URL or 'not yet created']
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
