---
description: Create a per-ticket worktree and start work on an AIEX story
argument-hint: "<AIEX-NNN>"
allowed-tools: Read, Write, Bash, Skill
model: haiku
---

# /start-aiex — Create Worktree and Start Story

Creates an isolated worktree for $ARGUMENTS, then delegates to `/embla-core:develop`.

---

## Step 1 — Validate input
If $ARGUMENTS is empty or not in format `AIEX-\d+`, stop and print:
"Usage: /start-aiex AIEX-NNN"

---

## Step 2 — Compute worktree path
- Main checkout: `c:/projects/claudeproject/ai-development-pulina`
- Worktree path: `c:/projects/claudeproject/ai-development-pulina-$ARGUMENTS`

If path already exists, stop and print:
"Worktree for $ARGUMENTS already exists at <path>. Run it with: cd <path>"

---

## Step 3 — Create the worktree
Run:
```
git worktree add c:/projects/claudeproject/ai-development-pulina-$ARGUMENTS -b feature/$ARGUMENTS-work
```

If a branch named `feature/$ARGUMENTS-*` already exists, use `--checkout` instead of `-b`.

---

## Step 4 — Copy environment
```
copy c:/projects/claudeproject/ai-development-pulina/.env c:/projects/claudeproject/ai-development-pulina-$ARGUMENTS/.env
```

---

## Step 5 — Print summary
Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Worktree created for $ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Path:   c:/projects/claudeproject/ai-development-pulina-$ARGUMENTS
Branch: feature/$ARGUMENTS-work

Open a new Claude Code window in that folder, then run:
  /embla-core:develop $ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
