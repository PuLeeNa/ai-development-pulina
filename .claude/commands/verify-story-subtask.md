---
description: Check all staged, unstaged, and committed changes against each subtask under the current branch's Jira story. Transitions covered subtasks to Done, keeps uncovered ones In Progress with guidance on what's missing. If all subtasks are Done, transitions the parent story to Done too.
allowed-tools: Bash, mcp__claude_ai_Atlassian__getJiraIssue, mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql, mcp__claude_ai_Atlassian__getTransitionsForJiraIssue, mcp__claude_ai_Atlassian__transitionJiraIssue
---

# /verify-story-subtask — Subtask Completion Check

Fetch all subtasks under the current branch's Jira story, assess whether the branch changes cover each one, transition covered subtasks to Done, and close the parent story if all subtasks are complete.

## Steps

### Step 1 — Identify the story ticket

Run `git branch --show-current` and parse the Jira ticket key from the branch name. Format is `feature/AIEX-NNN-description` — extract `AIEX-NNN`.

If no key can be parsed, stop: `Cannot determine Jira ticket from branch name. Expected format: feature/AIEX-NNN-description`.

### Step 2 — Fetch the story and its subtasks

Run in parallel:

- Call `mcp__claude_ai_Atlassian__getJiraIssue` with cloudId `fb779f96-2443-4319-b441-63d66a63bbaf` and the story key — capture summary, description, and current status
- Call `mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql` with:
  - cloudId: `fb779f96-2443-4319-b441-63d66a63bbaf`
  - jql: `parent = AIEX-NNN AND issuetype = Subtask ORDER BY created ASC`
  - fields: `["summary", "description", "status"]`

If no subtasks are found, stop and tell the user: `No subtasks found under AIEX-NNN. Use /verify-story to check story-level alignment instead.`

### Step 3 — Gather all branch changes

Run in parallel:
- `git diff $(git merge-base main HEAD)` — committed changes vs main
- `git diff --cached` — staged changes
- `git diff` — unstaged changes
- `git log $(git merge-base main HEAD)..HEAD --oneline` — commit list

Combine all three diffs into a single picture of "everything changed on this branch."

### Step 4 — Assess each subtask

For each subtask, read its summary and description, then compare against the combined diff:

- **Covered** — the changes clearly implement what the subtask describes (matching files, logic, tests)
- **Partially covered** — some work is present but something described in the subtask is missing
- **Not covered** — no relevant changes found for this subtask

For subtasks that are already `Done` in Jira, skip assessment and mark them as already closed.

### Step 5 — Confirm before transitioning

Before making any Jira changes, show the assessment and ask for approval:

```
The following subtasks are covered and ready to close:
  ✅ AIEX-NNN — <subtask summary>
  ✅ AIEX-NNN — <subtask summary>

Transition these to Done in Jira? (yes / no)
```

If the user says **no** — stop here. Print the full report from Step 7 but make no Jira changes.

If the user says **yes** — proceed to Step 6.

If there are no covered subtasks — skip this step and go straight to Step 7.

### Step 6 — Transition covered subtasks to Done

For each subtask assessed as **covered** and not already Done:

1. Call `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` with the subtask key to get available transitions
2. Find the transition with name `Done` (or `Closed` if `Done` is not available)
3. Call `mcp__claude_ai_Atlassian__transitionJiraIssue` to transition it
4. Print: `✅ AIEX-NNN → Done`

Do not transition subtasks that are partially covered or not covered.

### Step 7 — Check if all subtasks are now Done

After transitioning covered subtasks, check whether every subtask under the story is now in `Done` status (including ones that were already Done before this run).

If **all subtasks are Done**:
1. Call `mcp__claude_ai_Atlassian__getTransitionsForJiraIssue` on the parent story
2. Find the `Done` transition
3. Call `mcp__claude_ai_Atlassian__transitionJiraIssue` to close the story
4. Print: `✅ AIEX-NNN (story) → Done — all subtasks complete`

If **not all subtasks are Done**, leave the story as-is.

### Step 8 — Report

Print the status summary first:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Subtask Check: AIEX-NNN — <story summary>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtasks:

  ✅ AIEX-NNN  <subtask summary>  → transitioned to Done
  ✅ AIEX-NNN  <subtask summary>  → already Done
  ⚠️  AIEX-NNN  <subtask summary>  → partially covered
  ❌ AIEX-NNN  <subtask summary>  → not covered

Story:
  ✅ AIEX-NNN → Done (all subtasks complete)
  — or —
  ⏳ AIEX-NNN → still In Progress (<N> subtasks remaining)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then, for every subtask that is ⚠️ partially covered or ❌ not covered, output a detailed implementation guide:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠  Implementation Required: AIEX-NNN — <subtask summary>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  <2–4 sentences covering: what needs to be built, which files to
   create or modify (with paths), what's already done if partially
   covered, and what's still missing. Be specific — name actual
   file paths, route methods, model fields, or component names.>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Output one summary per uncovered or partially covered subtask, in the same order they appear in Jira. Base all file paths on the actual project structure (`app/api/`, `app/`, `__tests__/api/`, `prisma/`, `lib/`, `types/`) — never invent paths that don't follow existing conventions.
