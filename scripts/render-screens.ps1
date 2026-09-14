Add-Type -AssemblyName System.Drawing

$rows = Import-Csv "F:\PROJECTS\BITGET HINGESIGHT\public\sample-trades.csv"
$bg = [System.Drawing.Color]::FromArgb(16, 18, 22)
$fg = [System.Drawing.Color]::FromArgb(230, 232, 236)
$dim = [System.Drawing.Color]::FromArgb(130, 136, 146)
$green = [System.Drawing.Color]::FromArgb(46, 189, 133)
$red = [System.Drawing.Color]::FromArgb(246, 70, 93)
$line = [System.Drawing.Color]::FromArgb(36, 40, 48)

function Fmt-Time($iso, $withYear) {
  $d = [DateTime]::Parse($iso, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal)
  if ($withYear) { return $d.ToString("yyyy-MM-dd HH:mm:ss") } else { return $d.ToString("MM-dd HH:mm") }
}

# ---- 1. Desktop order history table: rows 1-12, full timestamps ----
$w = 1400; $h = 90 + 12 * 44
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear($bg)
$head = New-Object System.Drawing.Font "Segoe UI", 11
$cell = New-Object System.Drawing.Font "Segoe UI", 12
$title = New-Object System.Drawing.Font "Segoe UI Semibold", 15
$g.DrawString("Order History", $title, (New-Object System.Drawing.SolidBrush $fg), 24, 14)
$cols = @(@("Time", 24), @("Pair", 250), @("Type", 420), @("Side", 540), @("Price", 660), @("Filled", 860), @("Fee", 1040), @("Status", 1220))
foreach ($c in $cols) { $g.DrawString($c[0], $head, (New-Object System.Drawing.SolidBrush $dim), $c[1], 56) }
for ($i = 0; $i -lt 12; $i++) {
  $r = $rows[$i]; $y = 90 + $i * 44
  $g.DrawLine((New-Object System.Drawing.Pen $line), 24, $y - 6, $w - 24, $y - 6)
  $side = (Get-Culture).TextInfo.ToTitleCase($r.side)
  $sb = if ($r.side -eq "buy") { $green } else { $red }
  $vals = @((Fmt-Time $r.timestamp $true), "$($r.symbol)/USDT", "Limit", $side, "$($r.price) USDT", "$($r.qty)", "$($r.fee) USDT", "Filled")
  for ($k = 0; $k -lt $vals.Count; $k++) {
    $brush = if ($k -eq 3) { New-Object System.Drawing.SolidBrush $sb } else { New-Object System.Drawing.SolidBrush $fg }
    $g.DrawString($vals[$k], $cell, $brush, $cols[$k][1], $y)
  }
}
$bmp.Save("F:\tmp\screen-desktop.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# ---- 2. Mobile order cards: rows 13-18, month-day only (no year), like many phone apps ----
$w = 720; $h = 140 + 6 * 210
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear($bg)
$big = New-Object System.Drawing.Font "Segoe UI Semibold", 20
$lab = New-Object System.Drawing.Font "Segoe UI", 15
$val = New-Object System.Drawing.Font "Segoe UI", 16
$g.DrawString("Orders   History", $big, (New-Object System.Drawing.SolidBrush $fg), 32, 40)
for ($i = 0; $i -lt 6; $i++) {
  $r = $rows[12 + $i]; $y = 140 + $i * 210
  $g.DrawLine((New-Object System.Drawing.Pen $line), 32, $y - 14, $w - 32, $y - 14)
  $side = if ($r.side -eq "buy") { "Buy" } else { "Sell" }
  $sb = if ($r.side -eq "buy") { $green } else { $red }
  $g.DrawString("$($r.symbol)/USDT", $big, (New-Object System.Drawing.SolidBrush $fg), 32, $y)
  $g.DrawString("$side · Limit", $lab, (New-Object System.Drawing.SolidBrush $sb), 32, $y + 44)
  $g.DrawString("Filled", $lab, (New-Object System.Drawing.SolidBrush $dim), 560, $y + 8)
  $g.DrawString("Price", $lab, (New-Object System.Drawing.SolidBrush $dim), 32, $y + 90)
  $g.DrawString("$($r.price)", $val, (New-Object System.Drawing.SolidBrush $fg), 220, $y + 88)
  $g.DrawString("Amount", $lab, (New-Object System.Drawing.SolidBrush $dim), 32, $y + 124)
  $g.DrawString("$($r.qty)", $val, (New-Object System.Drawing.SolidBrush $fg), 220, $y + 122)
  $g.DrawString("Time", $lab, (New-Object System.Drawing.SolidBrush $dim), 400, $y + 90)
  $g.DrawString((Fmt-Time $r.timestamp $false), $val, (New-Object System.Drawing.SolidBrush $fg), 480, $y + 88)
}
$bmp.Save("F:\tmp\screen-mobile.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"rendered"
