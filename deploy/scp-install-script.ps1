# Copy vps-install.sh to your VPS (password prompted once by OpenSSH).
# Usage: .\deploy\scp-install-script.ps1 -Server 187.127.148.57
param(
  [string] $Server = "187.127.148.57",
  [string] $User = "root"
)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here "vps-install.sh"
if (-not (Test-Path $src)) { throw "Missing $src" }
scp $src "${User}@${Server}:/root/vps-install.sh"
Write-Host ""
Write-Host "Next, SSH in and run (set your real API URL):"
Write-Host "  ssh ${User}@${Server}"
Write-Host "  chmod +x /root/vps-install.sh"
Write-Host '  NEXT_PUBLIC_API_URL="https://YOUR-BACKEND/api" bash /root/vps-install.sh'
