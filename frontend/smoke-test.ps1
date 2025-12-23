param(
  [string]$BaseUrl = "http://localhost:4000",
  [string]$Token = ""
)
Write-Host ">> Checking $BaseUrl/healthz"
try {
  $resp = Invoke-WebRequest -UseBasicParsing "$BaseUrl/healthz" -TimeoutSec 10
  Write-Host ("Health: {0}" -f $resp.Content)
} catch {
  Write-Error "Healthcheck failed: $_"
  exit 1
}

if ($Token -ne "") {
  Write-Host ">> Checking protected admin endpoint (example, adjust path as needed)"
  try {
    $headers = @{ "Authorization" = "Bearer $Token" }
    $resp2 = Invoke-WebRequest -UseBasicParsing "$BaseUrl/api/admin/products?page=1" -Headers $headers -TimeoutSec 10
    Write-Host ("Admin endpoint OK, length={0}" -f $resp2.Content.Length)
  } catch {
    Write-Warning "Admin endpoint check failed (path may differ)."
  }
}

Write-Host "Smoke test completed."
