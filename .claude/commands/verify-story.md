---
description: Verify that all staged, unstaged, and committed changes on the current branch are aligned with the Jira story the branch was created from. Flags out-of-scope changes and missing acceptance criteria.
allowed-tools: Bash, mcp__claude_ai_Atlassian__getJiraIssue
---

# /verify-story — Branch Alignment Check

Fetch the Jira story linked to this branch, then check whether all changes on the branch actually deliver what the story asks for — and nothing more.

## Steps

### Step 1 — Identify the ticket

Run `git branch --show-current` and parse the Jira ticket key from the branch name. Format is `feature/AIEX-NNN-description` — extract `AIEX-NNN`.

If no ticket key can be parsed from the branch name, stop and tell the user: `Cannot determine Jira ticket from branch name. Expected format: feature/AIEX-NNN-description`.

### Step 2 — Fetch the Jira story

Call `mcp__claude_ai_Atlassian__getJiraIssue` with:
- cloudId: `fb779f96-2443-4319-b441-63d66a63bbaf`
- issueIdOrKey: the parsed ticket key

Extract:
- Summary
- Description
- Acceptance criteria (look for an "Acceptance Criteria" section in the description)
- Issue type and status

### Step 3 — Gather all branch changes

Run in parallel:
- `git diff $(git merge-base main HEAD)` — full diff of committed changes vs main
- `git diff` — unstaged changes
- `git diff --cached` — staged changes
- `git log $(git merge-base main HEAD)..HEAD --oneline` — commit history on this branch

### Step 4 — Analyse alignment

Compare the Jira story requirements against the actual changes:

**Check for scope alignment:**
- Do the changed files match what the story describes? (e.g. a bid submission story should touch bid-related routes and UI, not unrelated files)
- Are there changes that have nothing to do with the story? Flag these as ⚠️ out of scope

**Check acceptance criteria coverage:**
- For each acceptance criterion in the Jira story, determine whether the changes address it
- Mark each AC item as: ✅ covered / ⚠️ partially covered / ❌ not yet addressed

**Check for uncommitted work:**
- If there are staged or unstaged changes, flag them — they exist but aren't committed yet

### Step 5 — Report

Print a structured report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Story Alignment: AIEX-NNN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Story:   <summary>
Status:  <jira status>

Acceptance Criteria Coverage:
  ✅ / ⚠️ / ❌  <AC item 1>
  ✅ / ⚠️ / ❌  <AC item 2>
  ...

Out-of-scope changes:
  ⚠️ <file> — <reason it looks unrelated>   (or "None detected")

Uncommitted work:
  ⚠️ <N> staged / <N> unstaged changes not yet committed  (or "None")

Overall: ✅ Aligned / ⚠️ Gaps found / ❌ Significant misalignment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If acceptance criteria are not present in the Jira description, note that and assess alignment based on the story summary alone.
