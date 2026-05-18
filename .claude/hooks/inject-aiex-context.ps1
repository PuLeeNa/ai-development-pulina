# PURPOSE: Prepend [Context: AIEX-NNN] to every prompt when on an AIEX branch
# Triggered: UserPromptSubmit
# Output: JSON with modified prompt written to stdout

$raw = [Console]::In.ReadToEnd()
$payload = $raw | ConvertFrom-Json

$prompt = $payload.prompt
$branch = git rev-parse --abbrev-ref HEAD 2>$null

if ($branch -match "AIEX-(\d+)") {
    $ticketId = "AIEX-$($matches[1])"
    # Only inject if prompt doesn't already mention the ticket
    if ($prompt -notmatch [regex]::Escape($ticketId)) {
        $modified = "[Context: $ticketId] $prompt"
        @{ prompt = $modified } | ConvertTo-Json -Compress
        exit 0
    }
}

# No modification needed — pass through unchanged
@{ prompt = $prompt } | ConvertTo-Json -Compress
