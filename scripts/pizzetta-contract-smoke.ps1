param(
  [string]$BaseUrl = 'https://pizzetta-kiosk-os.pizzetta-kiosk.workers.dev'
)

$ErrorActionPreference = 'Stop'
$passed = 0
function Assert-Check([bool]$Condition, [string]$Name) {
  if (-not $Condition) { throw "FAIL: $Name" }
  $script:passed++
  Write-Host "PASS: $Name" -ForegroundColor Green
}

$health = Invoke-RestMethod "$BaseUrl/api/health"
Assert-Check ([bool]$health.data.ok) 'health endpoint'

$menu = Invoke-RestMethod "$BaseUrl/api/menu"
Assert-Check ($menu.data.results.Count -ge 30) 'menu contains active items'
Assert-Check (($menu.data.results | Where-Object { $_.category_name -eq 'Classics' }).Count -ge 7) 'classics category present'

$branches = Invoke-RestMethod "$BaseUrl/api/branches"
Assert-Check ($branches.data.results.Count -eq 3) 'three active branches'

$invalid = $null
try { $invalid = Invoke-WebRequest "$BaseUrl/api/order-requests" -Method Post -ContentType 'application/json' -Body '{"serviceMode":"PICKUP","items":[]}' } catch { $invalid = $_.Exception.Response }
Assert-Check ([int]$invalid.StatusCode -eq 400) 'request validation rejects incomplete payload'

$unknown = $null
try { $unknown = Invoke-WebRequest "$BaseUrl/api/order-requests/not-a-real-request" } catch { $unknown = $_.Exception.Response }
Assert-Check ([int]$unknown.StatusCode -eq 404) 'tracking endpoint does not reveal unknown requests'

Write-Host "PIZZETTA CONTRACT SMOKE: $passed checks passed" -ForegroundColor Cyan
