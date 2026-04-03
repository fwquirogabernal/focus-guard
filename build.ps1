# Focus Guard - Build & Package Script

$ExtName = "focus-guard"
$OutDir = "dist"
$ZipFile = "$OutDir\$ExtName.zip"

$Files = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "popup.css",
    "icons"
)

# Build CSS
Write-Host "Building CSS..." -ForegroundColor Cyan
npm run build:css
if ($LASTEXITCODE -ne 0) {
    Write-Host "CSS build failed." -ForegroundColor Red
    exit 1
}

# Clean previous build
if (Test-Path $OutDir) {
    Remove-Item $OutDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutDir | Out-Null

# Copy files to dist
foreach ($file in $Files) {
    $dest = Join-Path $OutDir $file
    if (Test-Path $file -PathType Container) {
        Copy-Item $file $dest -Recurse
    } else {
        Copy-Item $file $dest
    }
}

# Create zip
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}
Compress-Archive -Path "$OutDir\*" -DestinationPath $ZipFile

# Clean copied files, keep only zip
Get-ChildItem $OutDir -Exclude "*.zip" | Remove-Item -Recurse -Force

$size = [math]::Round((Get-Item $ZipFile).Length / 1KB, 1)
Write-Host "Package created: $ZipFile ($size KB)" -ForegroundColor Green
