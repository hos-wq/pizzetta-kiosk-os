$ErrorActionPreference = 'Stop'

Set-Location (Split-Path -Parent $PSScriptRoot)
$env:CLOUDFLARE_ACCOUNT_ID = '8be7480866dfaf93ee59a10987335f01'

Write-Host 'PIZZETTA KIOSK / CLOUDFLARE SESSION' -ForegroundColor Yellow
Write-Host 'The token is used only in this PowerShell session and is not written to disk.' -ForegroundColor DarkGray

$secureToken = Read-Host 'Paste Cloudflare API token' -AsSecureString
$tokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $rawToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)
  # Clipboard pastes can carry CR/LF or other control characters; remove them before HTTP.
  $env:CLOUDFLARE_API_TOKEN = ($rawToken -replace '[\s\p{C}]', '').Trim()
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
}

if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN)) { throw 'Cloudflare token was empty after sanitization.' }
$headers = @{ Authorization = "Bearer $($env:CLOUDFLARE_API_TOKEN)" }
$verification = Invoke-RestMethod `
  -Uri 'https://api.cloudflare.com/client/v4/user/tokens/verify' `
  -Headers $headers `
  -Method Get

if (-not $verification.success -or $verification.result.status -ne 'active') {
  throw "Cloudflare token is not active. Status: $($verification.result.status)"
}

Write-Host "Cloudflare token verified: $($verification.result.status)" -ForegroundColor Green
npx wrangler@4.160.0 whoami
Write-Host 'Session ready for Pizzetta Kiosk.' -ForegroundColor Green
