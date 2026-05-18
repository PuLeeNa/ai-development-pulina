---
description: Create and switch to a new branch linked to a Jira story. Handles branch type selection, name generation from the story summary, and checkout from the latest main.
allowed-tools: Bash, mcp__claude_ai_Atlassian__getJiraIssue
---

# /new-branch — Create a branch from main

## Steps

### Step 1 — Branch type

Ask the user:

> "Is this a feature or bug branch? (feature / bug)"

- `feature` → format: `feature/{ISSUE_KEY}-{summary}`
- `bug` → format: `bugfix/{ISSUE_KEY}-{summary}`

### Step 2 — Jira task key

Ask the user:

> "What is the Jira task key? (e.g. AIEX-728)"

### Step 3 — Fetch story summary

Call `mcp__claude_ai_Atlassian__getJiraIssue` with:
- cloudId: `fb779f96-2443-4319-b441-63d66a63bbaf`
- issueIdOrKey: the key provided

Extract the `summary` field. Derive a **4–5 word slug** that captures the core meaning of the story — not a truncation of the full text, but a meaningful short phrase:
- Strip filler ("As a user, I want to", "so that", etc.)
- Pick the 4–5 most descriptive words from what remains
- Lowercase, words joined with `-`
- Remove special characters

**Example:** `"As a bidder, I want to submit a sealed bid on an open listing"` → core concept: `submit sealed bid listing` → slug: `submit-sealed-bid-listing`

**Example:** `"As a losing bidder, I want to see my own bid alongside the winner's after close"` → core concept: `losing bidder reveal own bid` → slug: `losing-bidder-reveal-own-bid`

### Step 4 — Propose branch name

Build the branch name:
- Feature: `feature/{ISSUE_KEY}-{slug}`
- Bug: `bugfix/{ISSUE_KEY}-{slug}`

Show the proposed name and confirm:

> "Branch name: `<branch-name>` — confirm? (yes / edit)"

If `edit` → ask for the branch name directly, then proceed.

### Step 5 — Create the branch from main

Run in sequence:

```bash
git checkout main
git pull
git checkout -b <branch-name>
```

If `git checkout main` fails (e.g. branch is named `master`), try `git checkout master` instead.

### Step 6 — Confirm

Print:

```
✅ Created and switched to: <branch-name>
   Based on: main (up to date)
   Jira:     <ISSUE_KEY> — <story summary>
```
