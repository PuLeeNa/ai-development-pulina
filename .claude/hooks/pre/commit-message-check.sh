#!/bin/bash
# PURPOSE: Validate commit message follows project convention before git commit
# Format: feat(AIEX-NNN): description  OR  fix|docs|chore|test|refactor(AIEX-NNN): description

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🎯 commit-message-check running..."

# Get the commit message from the bash command being run
TOOL_INPUT="$CLAUDE_TOOL_INPUT"

# Only check if this is a git commit command
if echo "$TOOL_INPUT" | grep -qE "git commit"; then
  MSG=$(echo "$TOOL_INPUT" | grep -oP '(?<=-m ")[^"]+(?=")')

  if [ -z "$MSG" ]; then
    exit 0  # No -m flag found, let git handle it
  fi

  PATTERN='^(feat|fix|docs|chore|test|refactor|ci|perf)\(AIEX-[0-9]+\): .+'

  if echo "$MSG" | grep -qE "$PATTERN"; then
    echo -e "${GREEN}✓ Commit message valid: $MSG${NC}"
    exit 0
  else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚫 INVALID COMMIT MESSAGE${NC}"
    echo -e "${RED}   Got: $MSG${NC}"
    echo -e "${RED}   Expected: feat(AIEX-NNN): description${NC}"
    echo -e "${RED}   Types: feat|fix|docs|chore|test|refactor|ci|perf${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
  fi
fi

exit 0
