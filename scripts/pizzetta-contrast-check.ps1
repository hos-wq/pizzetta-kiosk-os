$tokens = @{
  Paper = '#FEF7E0'
  Charcoal = '#24221F'
  Orange = '#E15603'
  Yellow = '#FDC500'
  Dough = '#E8C99F'
}
function Luma($hex) {
  $rgb = 1..5 | ForEach-Object { [Convert]::ToInt32($hex.Substring($_, 2), 16) / 255 }
  $lin = $rgb | ForEach-Object { if ($_ -le .03928) { $_ / 12.92 } else { [Math]::Pow((($_ + .055) / 1.055), 2.4) } }
  return .2126*$lin[0] + .7152*$lin[1] + .0722*$lin[2]
}
function Ratio($a,$b) { $l1=Luma($a); $l2=Luma($b); if($l1 -lt $l2){$tmp=$l1;$l1=$l2;$l2=$tmp}; return ($l1+.05)/($l2+.05) }
$paperCharcoal = Ratio $tokens.Paper $tokens.Charcoal
$paperOrange = Ratio $tokens.Paper $tokens.Orange
$paperYellow = Ratio $tokens.Paper $tokens.Yellow
Write-Host ("Paper/Charcoal: {0:N2}:1" -f $paperCharcoal)
Write-Host ("Paper/Orange:   {0:N2}:1" -f $paperOrange)
Write-Host ("Paper/Yellow:   {0:N2}:1" -f $paperYellow)
if ($paperCharcoal -lt 4.5) { throw 'Charcoal fails normal text contrast' }
if ($paperOrange -lt 3) { throw 'Orange fails large-text contrast' }
if ($paperYellow -lt 3) { Write-Warning 'Yellow is decorative only on Paper; use Charcoal or Orange for text.' }
Write-Host 'PIZZETTA CONTRAST CHECK: PASS' -ForegroundColor Green
