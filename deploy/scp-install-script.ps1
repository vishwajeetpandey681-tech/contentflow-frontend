# Copy vps-install.sh to your VPS (password prompted once by OpenSSH).
# Usage: .\deploy\scp-install-script.ps1 -Server 187.127.148.57
param(
  [string] $Server = "187.127.148.57",
  [string] $User = "root"
)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach ($f in @("vps-install.sh", "charcha-express-install.sh")) {
  $src = Join-Path $here $f
  if (-not (Test-Path $src)) { throw "Missing $src" }
  scp $src "${User}@${Server}:/root/$f"
}
Write-Host ""
Write-Host "Next, SSH in and run:"
Write-Host "  ssh ${User}@${Server}"
Write-Host '  chmod +x /root/vps-install.sh /root/charcha-express-install.sh'
Write-Host '  bash /root/charcha-express-install.sh'
Write-Host '  (override env vars before bash if your URLs differ from Charcha Express defaults.)'
