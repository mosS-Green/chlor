# PWA Icons Setup Script for Chlor

$IconsDir = Join-Path $PSScriptRoot 'public/icons'
if (-not (Test-Path $IconsDir)) {
    New-Item -ItemType Directory -Force -Path $IconsDir | Out-Null
}

$SourceIcon = 'C:/Users/leafi/.gemini/antigravity-ide/brain/0862afec-ff61-43e6-9a9d-122c0ae4f6aa/chlor_logo_black_1783789202864.png'

if (Test-Path $SourceIcon) {
    Copy-Item -Path $SourceIcon -Destination (Join-Path $IconsDir 'icon-512.png') -Force
    Copy-Item -Path $SourceIcon -Destination (Join-Path $IconsDir 'icon-192.png') -Force
    Copy-Item -Path $SourceIcon -Destination (Join-Path $IconsDir 'apple-touch-icon.png') -Force
    Write-Output '✓ PWA icons successfully copied!'
} else {
    Write-Output 'Error: Source icon not found'
}
