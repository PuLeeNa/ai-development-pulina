#!/bin/bash
# PURPOSE: Detect hardcoded secrets before any file write operation
# Scans new file content for API keys, tokens, passwords

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🔐 secret-scan running..."

# Only scan Write/Edit tool calls
TOOL_NAME="$CLAUDE_TOOL_NAME"
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

CONTENT="$CLAUDE_TOOL_INPUT"

# Patterns to detect
PATTERNS=(
  "sk-[a-zA-Z0-9]{20,}"           # OpenAI / Stripe secret keys
  "password\s*=\s*['\"][^'\"]{6,}" # Hardcoded passwords
  "secret\s*=\s*['\"][^'\"]{8,}"   # Hardcoded secrets
  "postgresql://[^:]+:[^@]{4,}@"   # Database URLs with passwords
  "eyJ[a-zA-Z0-9_-]{10,}"          # JWT tokens
  "supabase.*service_role"         # Supabase service role key
)

for pattern in "${PATTERNS[@]}"; do
  if echo "$CONTENT" | grep -qiE "$pattern"; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚫 POTENTIAL SECRET DETECTED${NC}"
    echo -e "${RED}   Pattern: $pattern${NC}"
    echo -e "${RED}   Use environment variables instead.${NC}"
    echo -e "${RED}   Add to .env, never hardcode in source.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ No secrets detected${NC}"
exit 0
