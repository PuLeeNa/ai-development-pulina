---
description: Verify that all staged, unstaged, and committed changes on the current branch are aligned with the Jira story the branch was created from. Flags out-of-scope changes and missing acceptance criteria.
allowed-tools: Bash, mcp__claude_ai_Atlassian__getJiraIssue
---

# /verify-story — Branch Alignment Check

Fetch the Jira story linked to this branch, then check whether all changes on the branch actually deliver what the story asks for — and nothing more.

## Steps

### Step 1 — Identify and verify the ticket

1. **Try branch name first.** Run `git branch --show-current` and parse the ticket from the branch name (format: `feature/AIEX-NNN-...`; use the first ticket number found).

   - If the branch matches the expected format → confirm with the user:

     > "I have you working on `<AIEX-NNN>` — is that right?"

     If yes → proceed. If they correct it → use their answer.

2. **If the branch doesn't match the expected format**, check session context — if a story ID is already present in the conversation or active task, use that as the candidate and confirm:

   > "I have you working on `<AIEX-NNN>` — is that right?"

   If yes → proceed. If they correct it → use their answer.

3. **If neither branch nor session has a usable ID**, ask the user directly:

   > "I couldn't determine the Jira ticket from your branch (`<branch>`) or session. Which story are you working on? (e.g. AIEX-728)"

   Use their answer → proceed.

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
