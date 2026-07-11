# PWA Icons Setup Script for Chlor
# Run this script to copy the generated high-quality icon to all required PWA sizes/paths.

$IconsDir = Join-Path $PSScriptRoot "public/icons"
if (-not (Test-Path $IconsDir)) {
    New-Item -ItemType Directory -Force -Path $IconsDir | Out-Null
}

$SourceIcon = "C:\Users\leafi\.gemini\antigravity-ide\brain\0862afec-ff61-43e6-9a9d-122c0ae4f6aa\chlor_logo_black_1783789202864.png"

if (Test-Path $SourceIcon) {
    # Copy to the required PWA icon names and sizes
    Copy-Item -Path $SourceIcon -Destination (Join-Path $IconsDir "icon-512.png") -Force
    Copy-Item -Path $SourceIcon -Destination (Join-Path $IconsDir "icon-192.png") -Force
    Copy-Item -Path $SourceIcon -Destination (Join-Path $IconsDir "apple-touch-icon.png") -Force
    Write-Host "✓ PWA icons successfully copied to public/icons/!" -ForegroundColor Green
} else {
    Write-Error "Source icon not found at: $SourceIcon`nPlease verify the path and make sure the icon exists in the artifact folder."
}
