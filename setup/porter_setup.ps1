# Porter Estate - one-shot setup for Claude <-> Revit/Blender MCP + Remote Control
# Run in PowerShell:  powershell -ExecutionPolicy Bypass -File .\porter_setup.ps1
$ErrorActionPreference = 'Continue'
function Step($msg) { Write-Host "`n==== $msg ====" -ForegroundColor Cyan }

# ---------------------------------------------------------------
Step "1/5 Claude Code CLI"
$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
    Write-Host "Installing Claude Code CLI..."
    irm https://claude.ai/install.ps1 | iex
    # refresh PATH for this session
    $env:Path = [Environment]::GetEnvironmentVariable('Path','User') + ';' +
                [Environment]::GetEnvironmentVariable('Path','Machine')
    $claude = Get-Command claude -ErrorAction SilentlyContinue
}
if ($claude) { Write-Host "OK: claude CLI found at $($claude.Source)" -ForegroundColor Green }
else { Write-Host "FAILED: claude still not on PATH. Close this window, reopen PowerShell, run this script again." -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------
Step "2/5 Horizun Revit MCP registration"
$reg = Join-Path $env:LOCALAPPDATA 'Programs\Horizun\MCP\server\client-tools\register-client.ps1'
if (Test-Path $reg) {
    & $reg -Client Both
    Write-Host "OK: Horizun registration helper ran." -ForegroundColor Green
} else {
    Write-Host "Horizun not found at $reg" -ForegroundColor Yellow
    $exe = Join-Path $env:LOCALAPPDATA 'Programs\Horizun\MCP\server\horizun-mcp.exe'
    if (Test-Path $exe) {
        claude mcp add --scope user horizun-revit -- "$exe"
        Write-Host "OK: registered horizun-mcp.exe directly with Claude Code." -ForegroundColor Green
    } else {
        Write-Host "SKIPPED: Horizun MCP does not appear to be installed. Re-run its setup.exe (with Revit closed) from github.com/HorizunGroup/horizun-revit-mcp/releases" -ForegroundColor Red
    }
}

# ---------------------------------------------------------------
Step "3/5 uv (needed by blender-mcp)"
if (-not (Get-Command uvx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing uv..."
    irm https://astral.sh/uv/install.ps1 | iex
    $env:Path = [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
}
if (Get-Command uvx -ErrorAction SilentlyContinue) { Write-Host "OK: uv installed." -ForegroundColor Green }
else { Write-Host "WARNING: uvx not on PATH yet; Blender MCP step may need a fresh PowerShell window." -ForegroundColor Yellow }

# ---------------------------------------------------------------
Step "4/5 Blender MCP registration"
claude mcp add --scope user blender -- uvx blender-mcp 2>$null
Write-Host "OK: blender-mcp registered with Claude Code." -ForegroundColor Green
Write-Host "NOTE: inside Blender you still need the BlenderMCP add-on enabled:" -ForegroundColor Yellow
Write-Host "  Blender > Edit > Preferences > Add-ons > install 'addon.py' from github.com/ahujasid/blender-mcp," -ForegroundColor Yellow
Write-Host "  then press N in the viewport > BlenderMCP tab > 'Connect to Claude' / Start MCP Server." -ForegroundColor Yellow

# ---------------------------------------------------------------
Step "5/5 Remote Control (links this PC to the cloud session)"
Write-Host "A login window may open the first time - sign in with the same Claude account you use in the browser."
Write-Host "Keep this window OPEN while working with Claude. Press Ctrl+C to disconnect later."
Set-Location $env:USERPROFILE\Documents
claude remote-control
