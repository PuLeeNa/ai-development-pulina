# AI SDLC Workflow — Sneaker Drop

This document captures the end-to-end AI-assisted software development lifecycle used to build this project. Each phase maps a human intent to a specific AI tool or command.

---

## Overview

```
Idea → Design → Backlog → Develop → Test → Review → Deploy
  ↑       ↑        ↑         ↑        ↑       ↑        ↑
  AI      AI       AI        AI       AI      AI       AI
```

Every phase is AI-augmented. The developer makes decisions; the AI executes, documents, and enforces quality.

---

## Phase 1 — Discovery & Design

**Tool:** `/superpowers:brainstorming`

**What it does:**
- Asks one clarifying question at a time to understand requirements
- Proposes 2–3 implementation approaches with trade-offs
- Presents design sections incrementally for approval
- Writes a validated spec document and commits it to git

**Output:** `docs/superpowers/specs/YYYY-MM-DD-<feature>-implementation.md`

**Example:**
```
/superpowers:brainstorming
args: "Sealed-bid sneaker auction — seller creates listing, bidders
       submit blind bids, highest wins at close"
```

**When to use:** Before writing a single line of code. Every feature, even small ones.

---

## Phase 2 — Backlog Creation

**Tool:** `/embla-core:jira spec <path>`

**What it does:**
- Reads the spec document from Phase 1
- Infers Epics, Stories, and Tasks from the spec
- Guides a per-item review flow (show draft → approve/edit/skip → create)
- Posts all items to Jira in the correct hierarchy

**Output:** Jira epics → stories → subtasks in the AIEX project backlog

**Example:**
```
/jira spec docs/superpowers/specs/2026-05-12-aiex-715-listing-management-implementation.md
```

**When to use:** After the spec is approved. Creates the full backlog in one pass.

---

## Phase 3 — Story Kickoff

**Tool:** `/embla-core:develop TICKET-ID`

**What it does:**
1. Fetches the Jira story and displays it
2. Transitions the story to **In Progress**
3. Offers to brainstorm the implementation plan
4. Proposes a feature branch name and creates it on approval
5. Guides commit messages and PR creation

**Example:**
```
/embla-core:develop AIEX-716
```

**When to use:** At the start of every story. Never skip — it connects the code work to Jira.

**Tip:** For tightly coupled stories in the same epic, brainstorm the whole epic together:
```
/embla-core:develop AIEX-716   # then manually fetch 721, 724 and brainstorm together
```

---

## Phase 4 — Implementation Planning

**Tool:** `/superpowers:writing-plans`

**What it does:**
- Reads the approved spec
- Produces a task-by-task plan with complete code in every step
- Follows TDD: write failing test → implement → verify pass → commit
- Saves the plan to `docs/superpowers/plans/`

**Output:** `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`

**Rules enforced:**
- No placeholders (`TBD`, `TODO`, "add error handling")
- Every step shows exact code and expected command output
- Each task ends with a git commit

**When to use:** Invoked automatically at the end of brainstorming. Can also be run standalone:
```
/superpowers:writing-plans
args: "AIEX-728 sealed bidding. Spec: docs/superpowers/specs/..."
```

---

## Phase 5 — Implementation (Subagent-Driven)

**Tool:** `/superpowers:subagent-driven-development`

**What it does:**
- Reads the plan from Phase 4
- Dispatches a fresh subagent per task (no context pollution)
- Runs two-stage review after each task:
  1. **Spec compliance** — does the code match what the spec requires?
  2. **Code quality** — is the implementation clean and correct?
- Loops until both reviewers approve before moving to the next task

**Model selection:**
| Task type | Model |
|---|---|
| Mechanical (1–2 files, complete spec) | haiku (fast, cheap) |
| Integration (multi-file, patterns) | sonnet |
| Architecture, review | opus |

**When to use:** Chosen at the end of Phase 4. The alternative is inline execution for simpler plans.

---

## Phase 6 — Version Control

**Setup:** Dual-remote push — one `git push` updates both Bitbucket and GitHub.

```bash
git remote set-url --add --push origin https://github.com/PuLeeNa/ai-development-pulina.git
git remote set-url --add --push origin https://pulinaw@bitbucket.org/emblaftdev/ai-development-pulina.git
```

**Branch convention:** `feature/AIEX-NNN-short-description`

**Commit convention:** `feat(AIEX-NNN): description` (Conventional Commits)

---

## Phase 7 — CI (Continuous Integration)

**Bitbucket:** `bitbucket-pipelines.yml`
**GitHub:** `.github/workflows/ci.yml`

Both pipelines run on every push and PR:
```
npm ci → npx prisma generate → npm test
```

Tests must pass before a PR can be merged.

**Test strategy:**
- Unit tests for API routes (Jest, mocked Prisma)
- TDD enforced by the implementation plan
- No UI tests — manual E2E verification per plan

---

## Phase 8 — Code Review & PR

**Tool:** `/superpowers:finishing-a-development-branch`

**What it does:**
1. Verifies all tests pass
2. Offers 4 options: merge locally / push & PR / keep / discard
3. Generates a PR description with summary and test plan

**PR description template:**
```markdown
## Summary
- [key change 1]
- [key change 2]

## Jira
[AIEX-NNN](https://emblaftdev.atlassian.net/browse/AIEX-NNN)

## Test Plan
- [ ] npm test — N tests pass
- [ ] [manual step]
```

---

## Phase 9 — Deployment

**Platform:** Vercel (connected to GitHub)

**Auto-deploy rules:**
| Trigger | Result |
|---|---|
| Push to any branch | Preview deployment (unique URL) |
| Merge to `master` | Production deployment (auto) |

**Environment variables (set in Vercel dashboard):**
| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543) — NOT direct (port 5432) |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | Production URL e.g. `https://ai-development-pulina.vercel.app` |

**Build command:** `prisma generate && next build`

**Key gotchas learned:**
- Use Supabase pooler URL (port 6543) in Vercel — direct connections (5432) fail in serverless
- Server Components must query Prisma directly — never fetch from own API routes (causes localhost-style failures)
- Prisma v7 requires `pg.Pool` passed to `PrismaPg`, not a raw connection string
- Next.js 16 dynamic route params are `Promise<{ id: string }>` — must `await params`

---

## Workflow Summary

```
1. /superpowers:brainstorming     → spec doc (docs/superpowers/specs/)
2. /embla-core:jira spec <path>   → Jira backlog (epics → stories → tasks)
3. /embla-core:develop AIEX-NNN   → branch + In Progress transition
4. /superpowers:writing-plans     → plan doc (docs/superpowers/plans/)
5. /superpowers:subagent-driven-development → implementation + reviews
6. git push                        → both Bitbucket + GitHub
7. CI passes                       → GitHub Actions + Bitbucket Pipelines
8. /superpowers:finishing-a-development-branch → PR created
9. Merge to master                 → Vercel auto-deploys
```

---

## Quick Reference

| Command | When |
|---|---|
| `/superpowers:brainstorming` | Before any code — turn idea into spec |
| `/embla-core:jira spec <path>` | After spec approved — create backlog |
| `/embla-core:develop AIEX-NNN` | Start of every story — kick off dev |
| `/superpowers:writing-plans` | After brainstorm — create task plan |
| `/superpowers:subagent-driven-development` | Execute the plan |
| `/superpowers:finishing-a-development-branch` | When done — PR and wrap up |
| `/embla-core:ai-review` | Optional — AI code review on Bitbucket PRs |
