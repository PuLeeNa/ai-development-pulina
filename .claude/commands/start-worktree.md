---
description: Start a new story in an isolated git worktree — picks from remaining Jira stories, sets up the workspace, and launches development.
allowed-tools: Bash, mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql
---

# /start-worktree — Create a worktree and start development

## Step 1 — Fetch remaining stories

Call `mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql` with:
- cloudId: `fb779f96-2443-4319-b441-63d66a63bbaf`
- jql: `project = AIEX AND assignee = currentUser() AND issuetype = Story AND statusCategory != Done ORDER BY created ASC`
- fields: `["summary", "status", "key"]`

Present results as a numbered list:

```
Remaining stories assigned to you:

  1. AIEX-732  In Progress  As a bidder, I want to update my bid before the listing closes
  2. AIEX-734  In Progress  As a bidder, I want to see only the bidder count on an open listing

Which story? (enter number or key)
```

If no stories remain, print: `No remaining AIEX stories assigned to you.` and stop.

## Step 2 — Derive branch name and confirm

From the selected story's summary, derive a **4–5 word slug**:
- Strip filler ("As a user, I want to", "so that I can", etc.)
- Pick the 4–5 most descriptive words from what remains
- Lowercase, joined with `-`, no special characters

Branch name format: `feature/{ISSUE_KEY}-{slug}`

**Example:** `"As a bidder, I want to update my bid before the listing closes"` → `update-bid-before-close` → `feature/AIEX-732-update-bid-before-close`

Show and confirm:

> "Branch: `feature/AIEX-NNN-slug` — confirm? (yes / edit)"

If `edit` → accept revised name, re-confirm.

## Step 3 — Create the worktree

```bash
git fetch origin master
git worktree add .worktrees/{ISSUE_KEY} -b feature/{ISSUE_KEY}-{slug} origin/master
```

Print: `✅ Worktree created at .worktrees/{ISSUE_KEY} on branch feature/{ISSUE_KEY}-{slug}`

## Step 4 — Install dependencies and verify baseline

```bash
cd .worktrees/{ISSUE_KEY}
npm install
npm test --no-coverage
```

If tests fail: report failures and ask whether to proceed or investigate first.

If tests pass: print `✅ Baseline: N tests passing — ready to develop`

## Step 5 — Start development

Invoke the `embla-core:develop` skill with the selected story key. It will fetch the story, assign it, transition to In Progress, and guide brainstorming. When it reaches the branch creation step, the branch already exists — confirm checkout of the existing branch.

---

## Cleanup (after PR is merged)

Run from the **main repo root**, not from inside the worktree:

```bash
git worktree remove .worktrees/{ISSUE_KEY}
git branch -d feature/{branch-name}
git worktree prune
```
