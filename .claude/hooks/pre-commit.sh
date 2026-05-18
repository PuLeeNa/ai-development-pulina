branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "Blocked: Cannot commit directly to '$branch'. Create a feature branch first (e.g. feature/AIEX-NNN-description)." >&2
  exit 2
fi

tsc_output=$(npx tsc --noEmit 2>&1)
if [ $? -ne 0 ]; then
  echo "TypeScript errors:" >&2
  echo "$tsc_output" >&2
  exit 2
fi

test_output=$(npm test 2>&1)
if [ $? -ne 0 ]; then
  echo "Test failures:" >&2
  echo "$test_output" >&2
  exit 2
fi
