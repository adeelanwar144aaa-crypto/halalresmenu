$slugs = @(
  'afandina','7-spices','exotic-karahai','darjeeling-express','alaturka','shamnah',
  'supreme-halal-meat','the-india-fleet-street','sam-s-grill-house','za-atar-bake'
)
$paths = @('/','/menu')
foreach ($s in $slugs) {
  foreach ($p in $paths) {
    $codes = @()
    for ($i=1; $i -le 3; $i++) {
      $url = "https://${s}.halalresmenu.com$p"
      $out = curl.exe -s -o NUL -w "%{http_code}" --max-time 90 $url
      $codes += $out
      Start-Sleep -Seconds 2
    }
    Write-Output "$s$p : $($codes -join ', ')"
  }
}
