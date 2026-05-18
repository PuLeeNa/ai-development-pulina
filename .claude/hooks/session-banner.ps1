# PURPOSE: Show orientation banner at session start — which worktree/branch you're in
# Triggered: SessionStart

$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { exit 0 }

$gitDir   = git rev-parse --git-dir 2>$null
$gitCommon = git rev-parse --git-common-dir 2>$null
$isWorktree = ($gitDir -ne $gitCommon)

$ticketId = ""
if ($branch -match "AIEX-(\d+)") {
    $ticketId = "AIEX-$($matches[1])"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ($isWorktree) {
    Write-Host "🌿 WORKTREE SESSION"
    Write-Host "   Branch:  $branch"
    if ($ticketId) {
        Write-Host "   Ticket:  $ticketId  →  https://emblaftdev.atlassian.net/browse/$ticketId"
    }
    $siblings = git worktree list --porcelain 2>$null |
        Select-String "branch refs/heads/" |
        ForEach-Object { ($_ -replace "branch refs/heads/","").Trim() } |
        Where-Object { $_ -ne $branch }
    if ($siblings) {
        Write-Host "   Other worktrees: $($siblings -join ', ')"
    }
} else {
    Write-Host "🏠 MAIN CHECKOUT  |  Branch: $branch"
    $worktrees = git worktree list 2>$null | Select-Object -Skip 1
    if ($worktrees) {
        Write-Host "   Active worktrees:"
        $worktrees | ForEach-Object { Write-Host "     $_" }
    }
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
