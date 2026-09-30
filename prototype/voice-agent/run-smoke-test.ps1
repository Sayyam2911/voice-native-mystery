$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
$ngrokExe = Join-Path $PSScriptRoot 'tools\ngrok.exe'
if (-not (Test-Path -LiteralPath $ngrokExe)) {
    $ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue
    if (-not $ngrokCommand) { throw 'ngrok is required.' }
    $ngrokExe = $ngrokCommand.Source
}

$env:ASSEMBLYAI_API_KEY = Read-Host 'AssemblyAI API key (hidden)' -MaskInput
$env:VOICE_POC_PIN = Read-Host 'Choose a demo PIN (hidden)' -MaskInput
$env:VOICE_POC_SHARED_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
if (-not $env:ASSEMBLYAI_API_KEY -or -not $env:VOICE_POC_PIN) { throw 'Both the API key and demo PIN are required.' }

$serverProcess = $null
$tunnelProcess = $null
$agentCreationAttempted = $false
$ngrokStdout = Join-Path $env:TEMP ("mystery-ngrok-$([guid]::NewGuid()).out.log")
$ngrokStderr = Join-Path $env:TEMP ("mystery-ngrok-$([guid]::NewGuid()).err.log")
try {
    $serverProcess = Start-Process -FilePath node -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    $tunnelProcess = Start-Process -FilePath $ngrokExe -ArgumentList @('http', '4173', '--log', 'stdout') -WindowStyle Hidden -RedirectStandardOutput $ngrokStdout -RedirectStandardError $ngrokStderr -PassThru
    Start-Sleep -Seconds 3

    if ($serverProcess.HasExited) { throw 'Prototype server did not start.' }
    if ($tunnelProcess.HasExited) {
        $details = @((Get-Content -LiteralPath $ngrokStdout -ErrorAction SilentlyContinue), (Get-Content -LiteralPath $ngrokStderr -ErrorAction SilentlyContinue)) -join "`n"
        throw "ngrok did not start. $details"
    }

    $tunnels = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels'
    $matching = @($tunnels.tunnels | Where-Object {
        $_.public_url -like 'https://*' -and $_.config.addr -match '4173$'
    })
    if ($matching.Count -ne 1) { throw 'Could not identify exactly one HTTPS ngrok tunnel for port 4173.' }
    $env:PUBLIC_BASE_URL = $matching[0].public_url

    $agentCreationAttempted = $true
    $agentOutput = & node (Join-Path $PSScriptRoot 'create-agents.mjs') 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Agent creation failed: $($agentOutput -join ' ')" }
    $witnessMatch = [regex]::Match(($agentOutput -join "`n"), '(?m)^witness: ([A-Za-z0-9_-]{12,})')
    $detectiveMatch = [regex]::Match(($agentOutput -join "`n"), '(?m)^detective: ([A-Za-z0-9_-]{12,})')
    if (-not $witnessMatch.Success -or -not $detectiveMatch.Success) { throw 'Agent IDs were not returned as expected.' }
    $env:VOICE_POC_WITNESS_AGENT_ID = $witnessMatch.Groups[1].Value
    $env:VOICE_POC_DETECTIVE_AGENT_ID = $detectiveMatch.Groups[1].Value
    if ($env:VOICE_POC_WITNESS_AGENT_ID -eq $env:VOICE_POC_DETECTIVE_AGENT_ID) { throw 'Both characters resolved to the same agent ID.' }
    foreach ($agentId in @($env:VOICE_POC_WITNESS_AGENT_ID, $env:VOICE_POC_DETECTIVE_AGENT_ID)) {
        $agent = Invoke-RestMethod -Uri "https://agents.assemblyai.com/v1/agents/$agentId" -Headers @{ Authorization = "Bearer $env:ASSEMBLYAI_API_KEY" }
        if ($agent.id -ne $agentId) { throw 'A stored agent could not be verified after creation.' }
    }

    Stop-Process -Id $serverProcess.Id
    $serverProcess.WaitForExit()
    $serverProcess = Start-Process -FilePath node -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 1
    if ($serverProcess.HasExited) { throw 'Prototype server did not restart with agent IDs.' }

    Write-Host 'The voice test is ready at http://localhost:4173'
    Write-Host 'Use Chrome or Edge. Enter the demo PIN, talk to each character, try barge-in, and inspect AssemblyAI credit usage.'
    Write-Host "Temporary callback URL: $env:PUBLIC_BASE_URL/v1/chat/completions"
    Read-Host 'Press Enter here when finished to stop the server and tunnel' | Out-Null
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue }
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $ngrokStdout, $ngrokStderr -ErrorAction SilentlyContinue
    $env:ASSEMBLYAI_API_KEY = $null
    $env:VOICE_POC_PIN = $null
    $env:VOICE_POC_SHARED_SECRET = $null
    $env:PUBLIC_BASE_URL = $null
    $env:VOICE_POC_WITNESS_AGENT_ID = $null
    $env:VOICE_POC_DETECTIVE_AGENT_ID = $null
    if ($agentCreationAttempted) {
        Write-Host 'Local test processes stopped. Any stored test agents created during this run remain in the AssemblyAI account.'
    } else {
        Write-Host 'Local test processes stopped. No test agents were created.'
    }
}
