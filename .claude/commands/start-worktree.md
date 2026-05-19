---
description: Start a new story in an isolated git worktree — picks from remaining Jira stories, sets up the workspace, and launches development.
allowed-tools: Bash, mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql
---

# /start-worktree

## Step 1 — Fetch remaining stories

Call `mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql` with:
- cloudId: `fb779f96-2443-4319-b441-63d66a63bbaf`
- jql: `project = AIEX AND assignee = currentUser() AND issuetype = Story AND statusCategory != Done ORDER BY created ASC`
- fields: `["summary", "status", "key"]`

Present as a numbered list with key, status, and summary. Ask: `Which story? (enter number or key)`

If no stories remain, print: `No remaining AIEX stories assigned to you.` and stop.

## Step 2 — Derive branch name and confirm

Strip filler phrases ("As a user, I want to", "so that I can", etc.) from the summary. Pick the 4–5 most descriptive remaining words — lowercase, hyphen-joined.

Branch format: `feature/{ISSUE_KEY}-{slug}`

Show and confirm: `Branch: feature/AIEX-NNN-slug — confirm? (yes / edit)`

If `edit` → accept revised name, re-confirm.

## Step 3 — Create the worktree and switch into it

```bash
git fetch origin master
git worktree add .worktrees/{ISSUE_KEY} -b feature/{ISSUE_KEY}-{slug} origin/master
cd .worktrees/{ISSUE_KEY}
```

Print: `✅ Worktree created at .worktrees/{ISSUE_KEY} on branch feature/{ISSUE_KEY}-{slug}`

You are now inside the worktree. All `git commit` commands from here run against `feature/{ISSUE_KEY}-{slug}`. Do not navigate back to the repo root to commit — that would land changes on the wrong branch. Step 4 is the only exception.

## Step 4 — Ensure jest config excludes worktrees

Check that root `jest.config.ts` has `"/.worktrees/"` in `testPathIgnorePatterns`. If missing, add it:

```typescript
testPathIgnorePatterns: ["/node_modules/", "/.worktrees/"],
```

If added, commit from the **repo root** (not the worktree):

```bash
git -C $(git rev-parse --show-toplevel) add jest.config.ts
git -C $(git rev-parse --show-toplevel) commit -m "chore: exclude worktrees from root jest test discovery"
```

## Step 5 — Install dependencies and verify baseline

```bash
npm install
npm test --no-coverage
```

If tests fail: report failures and ask whether to proceed or investigate first.

If tests pass: print `✅ Baseline: N tests passing — ready to develop`

## Step 6 — Start development

Invoke the `embla-core:develop` skill with the selected story key. When it reaches the branch creation step, the branch already exists — confirm checkout of the existing branch.

---

## Cleanup (after PR is merged)

Run from the **main repo root**, not from inside the worktree:

```bash
git worktree remove .worktrees/{ISSUE_KEY}
git branch -d feature/{branch-name}
git worktree prune
```
