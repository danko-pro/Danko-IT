param(
    [switch]$SkipFrontend,
    [switch]$SkipHealth,
    [switch]$IncludeUiSmoke
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AdminHealthUrl = "http://127.0.0.1:8000/api/health"
$FrontendUrl = "http://127.0.0.1:5173/"

function Invoke-ProjectStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

function Test-HttpEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    Write-Host ""
    Write-Host "==> $Name"
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    } catch {
        throw "$Name failed: $($_.Exception.Message)"
    }

    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "$Name returned HTTP $($response.StatusCode)"
    }

    Write-Host "$Name OK ($($response.StatusCode))"
}

Push-Location $RepoRoot
try {
    Invoke-ProjectStep "ruff" { python -m ruff check src tests --no-cache }
    Invoke-ProjectStep "pytest" { python -m pytest -q }
    Invoke-ProjectStep "architecture guard" { python -m tools.architecture_guard check --root $RepoRoot }

    if (-not $SkipFrontend) {
        Invoke-ProjectStep "admin-ui build" {
            Push-Location (Join-Path $RepoRoot "admin-ui")
            try {
                npm run build
            } finally {
                Pop-Location
            }
        }
    }

    if (-not $SkipHealth) {
        Test-HttpEndpoint "admin API health" $AdminHealthUrl
        Test-HttpEndpoint "admin UI dev server" $FrontendUrl
    }

    if ($IncludeUiSmoke) {
        if ($SkipFrontend -or $SkipHealth) {
            throw "IncludeUiSmoke requires frontend build and health checks. Remove SkipFrontend/SkipHealth."
        }
        Invoke-ProjectStep "admin-ui smoke" {
            Push-Location (Join-Path $RepoRoot "admin-ui")
            try {
                npm run smoke:ui
            } finally {
                Pop-Location
            }
        }
    }

    Write-Host ""
    Write-Host "Project checks passed."
} finally {
    Pop-Location
}
