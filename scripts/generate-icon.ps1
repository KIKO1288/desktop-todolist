param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets')
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [System.Drawing.RectangleF]$Rectangle,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$pngPath = Join-Path $OutputDirectory 'app-icon.png'
$icoPath = Join-Path $OutputDirectory 'app-icon.ico'

$bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

$backgroundPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(12, 12, 232, 232)) 42
$backgroundBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#315C51'))
$graphics.FillPath($backgroundBrush, $backgroundPath)

$paperPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(52, 38, 152, 180)) 16
$paperBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#F2E9D5'))
$graphics.FillPath($paperBrush, $paperPath)

$clipPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(96, 24, 64, 30)) 10
$clipBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#9C9588'))
$graphics.FillPath($clipBrush, $clipPath)

$linePen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#A8A18E'), 5)
$linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
foreach ($y in 82, 120, 158, 196) {
  $graphics.DrawLine($linePen, 96, $y, 178, $y)
}

$boxPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#315C51'), 5)
$graphics.DrawRectangle($boxPen, 70, 70, 24, 24)
$graphics.DrawRectangle($boxPen, 70, 108, 24, 24)
$graphics.DrawRectangle($boxPen, 70, 146, 24, 24)
$graphics.DrawRectangle($boxPen, 70, 184, 24, 24)

$checkPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#B6502D'), 12)
$checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLines($checkPen, [System.Drawing.PointF[]]@(
  [System.Drawing.PointF]::new(68, 154),
  [System.Drawing.PointF]::new(82, 168),
  [System.Drawing.PointF]::new(111, 132)
))

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
$backgroundBrush.Dispose()
$paperBrush.Dispose()
$clipBrush.Dispose()
$linePen.Dispose()
$boxPen.Dispose()
$checkPen.Dispose()
$backgroundPath.Dispose()
$paperPath.Dispose()
$clipPath.Dispose()

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$stream = [System.IO.File]::Create($icoPath)
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)
$writer.Write($pngBytes)
$writer.Dispose()

Write-Output "Generated $pngPath and $icoPath"
