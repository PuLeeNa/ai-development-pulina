branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "Blocked: Cannot commit directly to '$branch'. Create a feature branch first (e.g. feature/AIEX-NNN-description)." >&2
  exit 2
fi
npx tsc --noEmit && npm test
