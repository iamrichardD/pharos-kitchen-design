<#
 .SYNOPSIS
  Installation Utility for Pharos Kitchen Design (Project Prism)
 
 .DESCRIPTION
  Windows-native PowerShell installer for the pkd-core CLI.
  Implements a high-rigor environment audit, SHA-256 verification,
  and non-privileged local installation.
 
 .PARAMETER InstallDir
  Override the installation directory (default: %LOCALAPPDATA%\pharos\bin)
 
 .PARAMETER Force
  Bypass environment audit and dependency checks.
 
 .EXAMPLE
  .\install.ps1
 
 .NOTES
  Project: Pharos Kitchen Design (Project Prism)
  Component: Installation Utility
  File: scripts/install.ps1
  Author: Richard D. (https://github.com/iamrichardd)
  License: FSL-1.1 (See LICENSE file for details)
  Traceability: Issue #94, ADR-0006, ADR-0017
#>

# ========================================================================
# Standardized File Prologue
# Project: Pharos Kitchen Design (Project Prism)
# Component: Installation Utility
# File: scripts/install.ps1
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Windows-native installer with high-rigor integrity checks.
# Traceability: Issue #94
# ========================================================================

param(
    [string]$InstallDir = "",
    [switch]$Force
)

# Enforce TLS 1.2/1.3 for secure downloads (Required for legacy PowerShell 5.1 compatibility)
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
} catch {
    # Fallback if Tls13 is not defined in the current environment
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

if (-not $InstallDir) {
    if ($env:LOCALAPPDATA) {
        $InstallDir = Join-Path $env:LOCALAPPDATA "pharos\bin"
    } else {
        $InstallDir = Join-Path $HOME ".local/share/pharos/bin"
    }
}

$ErrorActionPreference = "Stop"

# Configuration
$BinaryName = "pkd"
$DefaultInstallDir = $InstallDir
$RepoUrl = "https://github.com/iamrichardD/pharos-kitchen-design"
$LatestReleaseUrl = "$RepoUrl/releases/latest/download"

# Branding & Colors
function Write-Logo {
    Write-Host "   ___ _                     " -ForegroundColor Cyan
    Write-Host "  / _ \ |__   __ _ _ __ ___  ___ " -ForegroundColor Cyan
    Write-Host " / /_)/ '_ \ / _\` | '__/ _ \/ __|" -ForegroundColor Cyan
    Write-Host "/ ___/| | | | (_| | | | (_) \__ \" -ForegroundColor Cyan
    Write-Host "\/    |_| |_|\__,_|_|  \___/|___/" -ForegroundColor Cyan
    Write-Host "                                 "
    Write-Host " PHAROS KITCHEN DESIGN (PKD)     " -ForegroundColor White
    Write-Host " Windows Installation Utility    " -ForegroundColor White
    Write-Host ""
}

function Log-Info ($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Log-Warn ($Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Log-Error ($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Platform Detection
function Get-Platform {
    $arch = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLower()
    
    if ($arch -eq "x64") {
        $TargetArch = "x86_64"
    } elseif ($arch -eq "arm64") {
        $TargetArch = "arm64"
    } else {
        Log-Error "Unsupported Architecture: $arch"
        exit 1
    }

    Log-Info "Platform Detected: windows ($TargetArch)"
    return @{ Platform = "windows"; Arch = $TargetArch }
}

# Environment Audit
function Audit-Environment {
    param([switch]$Force)
    
    Log-Info "Performing environment audit..."
    $missing = @()

    if (-not (Get-Command "curl" -ErrorAction SilentlyContinue)) {
        $missing += "curl"
    }

    if ($missing.Count -gt 0) {
        Log-Error "Missing dependencies: $($missing -join ', ')"
        if (-not $Force) {
            exit 1
        }
        Log-Warn "Bypassing audit due to -Force flag."
    }

    Log-Info "Environment audit passed."
}

# Acquisition & Verification
function Fetch-And-Verify {
    param($PlatformInfo, [switch]$Force)
    
    $artifactName = "pkd-core-$($PlatformInfo.Platform)-$($PlatformInfo.Arch).zip"
    $downloadUrl = "$LatestReleaseUrl/$artifactName"
    $checksumUrl = "$downloadUrl.sha256"

    $tmpDir = Join-Path $env:TEMP ([Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
    
    $zipPath = Join-Path $tmpDir $artifactName
    $checksumPath = "$zipPath.sha256"

    Log-Info "Downloading $artifactName..."
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    } catch {
        Log-Error "Failed to download binary from $downloadUrl"
        exit 1
    }

    Log-Info "Downloading checksum..."
    try {
        Invoke-WebRequest -Uri $checksumUrl -OutFile $checksumPath -UseBasicParsing
        
        Log-Info "Verifying SHA-256 checksum..."
        $expectedHash = (Get-Content $checksumPath).Split(" ")[0].Trim()
        $actualHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLower()

        if ($expectedHash -ne $actualHash) {
            Log-Error "SHA-256 verification failed!"
            Log-Error "Expected: $expectedHash"
            Log-Error "Actual:   $actualHash"
            exit 1
        }
        Log-Info "Checksum verified."
    } catch {
        Log-Warn "Integrity could not be verified automatically."
        if (-not $Force) {
            Log-Error "Mandatory checksum verification failed. Aborting."
            exit 1
        }
    }

    Log-Info "Extracting artifact..."
    Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force
    
    $extractedBinary = Join-Path $tmpDir "$BinaryName.exe"
    if (-not (Test-Path $extractedBinary)) {
        # Fallback if the zip doesn't have the .exe suffix inside or is named differently
        $extractedBinary = Get-ChildItem -Path $tmpDir -Filter "$BinaryName*" | Select-Object -First 1
    }

    return $extractedBinary
}

# Installation
function Install-Binary ($ExtractedPath) {
    if (-not (Test-Path $DefaultInstallDir)) {
        Log-Info "Creating installation directory: $DefaultInstallDir"
        New-Item -ItemType Directory -Path $DefaultInstallDir -Force | Out-Null
    }

    $destPath = Join-Path $DefaultInstallDir "$BinaryName.exe"
    Log-Info "Installing binary to $destPath..."
    
    Move-Item -Path $ExtractedPath -Destination $destPath -Force
    Log-Info "Binary installed successfully."
}

# PATH Management
function Update-Path {
    Log-Info "Auditing environment PATH..."
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -split ";" -contains $DefaultInstallDir) {
        Log-Info "PATH audit passed: $DefaultInstallDir is in your User PATH."
    } else {
        Log-Warn "$DefaultInstallDir is NOT in your PATH."
        Log-Info "Adding $DefaultInstallDir to User PATH..."
        
        $newPath = "$currentPath;$DefaultInstallDir"
        try {
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Log-Info "PATH updated. Please restart your terminal or run: `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','User')"
        } catch {
            Log-Warn "Could not update User PATH automatically. This is expected on non-Windows environments."
        }
    }
}

# Main
function Main {
    param([switch]$Force)

    Write-Logo
    Log-Info "Initializing Pharos Installation Environment..."

    $platform = Get-Platform
    Audit-Environment -Force:$Force
    
    $binaryPath = Fetch-And-Verify -PlatformInfo $platform -Force:$Force
    Install-Binary -ExtractedPath $binaryPath
    Update-Path

    Log-Info "Installation complete. Stay remarkable."
    
    $exePath = Join-Path $DefaultInstallDir "$BinaryName.exe"
    if (Test-Path $exePath) {
        & $exePath --version
    } else {
        Log-Warn "Verification command skipped. Ensure $DefaultInstallDir is in your PATH."
    }
}

Main -Force:$Force
