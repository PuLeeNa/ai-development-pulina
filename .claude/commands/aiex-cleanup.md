---
description: Prune stale worktrees and gone branches for this project
argument-hint: "(no arguments)"
allowed-tools: Bash
model: haiku
---

# /aiex-cleanup — Prune Stale Worktrees

---

## Step 1 — Prune detached entries
Run: `git worktree prune --verbose`

---

## Step 2 — List remaining worktrees
Run: `git worktree list`
Show output so user can see current state.

---

## Step 3 — Find gone-remote worktrees
Run: `git branch -vv`
Look for branches with `[origin/...: gone]`. These are branches deleted on remote but still local.

For each gone branch that has a worktree, ask the user:
"Remove worktree for <branch>? (yes / no)"

If yes: `git worktree remove <path> --force`

---

## Step 4 — Summary
Print how many worktrees were removed and what remains.
