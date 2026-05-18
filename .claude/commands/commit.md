---
description: Stage all changes, validate commit message format, and commit
argument-hint: "<optional commit message>"
allowed-tools: Bash, Read
model: claude-haiku-4-5-20251001
---

# /commit — Validated Commit

Commits all changes following the project commit convention.

---

## Step 1 — Run tests
Run: `npm test`
If tests fail: stop and report. Do not commit broken code.

---

## Step 2 — Show what will be committed
Run: `git status` and `git diff --staged`

---

## Step 3 — Determine commit message
If $ARGUMENTS is provided: use it as the commit message.
If empty: generate a Conventional Commit message from the diff.

Format: `feat(AIEX-NNN): short description`
Types: feat | fix | docs | chore | test | refactor

---

## Step 4 — Confirm with user
Print the proposed commit message and ask: "Commit with this message? (yes / edit / cancel)"
- yes → commit
- edit → accept new message, re-show, re-ask
- cancel → stop

---

## Step 5 — Commit
Run: `git add -A && git commit -m "<message>"`

---

## Step 6 — Tell the user
Print:
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Committed: <message>
Run 'git push' to push to both remotes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
