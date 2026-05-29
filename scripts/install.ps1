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
  Traceability: Issue #94, Issue #162, ADR-0006, ADR-0017
#>

# ========================================================================
# Standardized File Prologue
# Project: Pharos Kitchen Design (Project Prism)
# Component: Installation Utility
# File: scripts/install.ps1
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Windows-native installer with high-rigor integrity checks.
# Traceability: Issue #94, Issue #162
# ========================================================================

param(
    [string]$InstallDir = "",
    [string]$Version = "",
    [switch]$Uninstall,
    [switch]$Purge,
    [switch]$Force
)

# Security [SEC-91-001]: Validate version string pattern to prevent 
# path traversal or injection during URL construction.
if ($Version -and $Version -notmatch '^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$') {
    Write-Error "Invalid version format: $Version. Expected format: v1.2.3, 1.2.3, or v1.2.3-beta.1"
    exit 1
}

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

# Authoritative: Local Version Discovery
function Get-LocalVersion {
    $binaryPath = Join-Path $DefaultInstallDir "$BinaryName.exe"
    if (Test-Path $binaryPath) {
        try {
            # We capture the version string (e.g., pkd 1.2.3) and extract the semver part.
            $raw = & $binaryPath --version 2>$null
            if ($raw -match "pkd\s+(\S+)") {
                return $matches[1]
            }
        } catch {}
    }
    return "none"
}

# Authoritative: Remote Version Discovery (Header Redirect)
function Get-LatestVersionTag {
    # Why: We use a header-redirect strategy to identify the latest version 
    #      without incurring GitHub API rate limits.
    $url = "$RepoUrl/releases/latest"
    
    try {
        $request = [System.Net.WebRequest]::Create($url)
        $request.Method = "HEAD"
        $request.AllowAutoRedirect = $false
        $response = $request.GetResponse()
        $location = $response.Headers["Location"]
        $response.Close()
        
        # Security [SEC-92-001]: Validate redirect location.
        if ($location -match "github\.com/.+/releases/tag/(.+)") {
            return $matches[1].Trim().Replace("`r", "")
        }
    } catch {
        # Fallback for older PowerShell versions
        Log-Warn "Could not determine remote version via HEAD request."
    }
    return "unknown"
}

# Authoritative: Update Check Logic
function Check-Update ($Version, [switch]$Force) {
    if ($Force) {
        Log-Info "Bypassing update check (-Force)."
        return $true
    }

    if ($Version) {
        Log-Info "Bypassing 'Authoritative' update check (Version pinned to $Version)."
        return $true
    }

    Log-Info "Performing 'Authoritative' update check..."
    
    $localVer = Get-LocalVersion
    $remoteTag = Get-LatestVersionTag

    if ($remoteTag -eq "unknown") {
        Log-Warn "Could not determine latest remote version. Proceeding."
        return $true
    }

    if ($localVer -eq "none") {
        Log-Info "No local installation found. Proceeding with fresh install."
        return $true
    }

    $cleanLocal = $localVer.TrimStart('v')
    $cleanRemote = $remoteTag.TrimStart('v')

    Log-Info "Local version: $localVer"
    Log-Info "Remote version: $remoteTag"

    if ($cleanLocal -eq $cleanRemote) {
        Log-Info "Authoritative Release: Already up-to-date."
        Log-Info "Stay remarkable."
        exit 0
    }

    Log-Info "Update available: $localVer -> $remoteTag"
    return $true
}

# Environment Audit
function Test-IsWritable ($Path) {
    Log-Info "Verifying writability of $Path..."
    
    $testFile = "pharos_write_test_$([Guid]::NewGuid().ToString()).tmp"
    
    # If path exists, check it directly
    if (Test-Path $Path) {
        $testPath = Join-Path $Path $testFile
        try {
            $null = New-Item -ItemType File -Path $testPath -ErrorAction Stop
            Remove-Item -Path $testPath -ErrorAction SilentlyContinue
            Log-Info "Directory is writable."
            return $true
        } catch {
            return $false
        }
    } else {
        # If it doesn't exist, find the first existing parent
        $parent = Split-Path $Path -Parent
        if (-not $parent) { $parent = "." }
        
        while ($parent -and -not (Test-Path $parent)) {
            $parent = Split-Path $parent -Parent
        }
        
        if (-not $parent) { $parent = "\" }

        $testPath = Join-Path $parent $testFile
        try {
            $null = New-Item -ItemType File -Path $testPath -ErrorAction Stop
            Remove-Item -Path $testPath -ErrorAction SilentlyContinue
            Log-Info "Parent directory $parent is writable."
            return $true
        } catch {
            return $false
        }
    }
}

function Audit-Environment {
    param([switch]$Force)
    
    Log-Info "Performing environment audit..."

    # Issue #90: check_writable Logic (Fail-Fast)
    if (-not (Test-IsWritable -Path $DefaultInstallDir)) {
        Log-Error "Installation directory is not writable: $DefaultInstallDir"
        if (-not $Force) {
            exit 1
        }
        Log-Warn "Bypassing writability check due to -Force flag."
    }

    Log-Info "Environment audit passed."
}

# Security Purge (Debt #102)
function Clear-PharosSecurity {
    Log-Info "Initiating Security Purge..."
    
    # 1. Clear Local Config
    $configDir = Join-Path $env:APPDATA "pharos"
    if (Test-Path $configDir) {
        Log-Info "Clearing local configuration: $configDir"
        Remove-Item -Path $configDir -Recurse -Force
    }

    # 2. Clear Windows Credential Manager entries (Parity with libsecret)
    # Why: We use keyring-rs which stores tokens in the Credential Manager.
    #      We target 'pharos-kitchen-design' service entries.
    Log-Info "Clearing Windows Credential Manager entries..."
    try {
        $targets = cmdkey /list | Select-String "target=pharos-kitchen-design"
        foreach ($targetLine in $targets) {
            # Extract target name: e.g., "Target: LegacyGeneric:target=pharos-kitchen-design"
            if ($targetLine -match "target=(pharos-kitchen-design\S*)") {
                $target = $matches[1]
                Log-Info "Removing credential: $target"
                cmdkey /delete:$target | Out-Null
            }
        }
    } catch {
        Log-Warn "Failed to clear some Windows credentials."
    }

    Log-Info "Security purge complete."
}

# Acquisition & Verification
function Fetch-And-Verify {
    param($PlatformInfo, [string]$Version, [switch]$Force)
    
    $artifactName = "pkd-core-$($PlatformInfo.Platform)-$($PlatformInfo.Arch).zip"
    
    if ($Version) {
        $downloadUrl = "$RepoUrl/releases/download/$Version/$artifactName"
        Log-Info "Target Version: $Version"
    } else {
        $downloadUrl = "$LatestReleaseUrl/$artifactName"
    }
    
    $checksumUrl = "$downloadUrl.sha256"

    $tmpDir = Join-Path $env:TEMP ([Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
    
    $zipPath = Join-Path $tmpDir $artifactName
    $checksumPath = "$zipPath.sha256"

    try {
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

        # We must copy the binary out of the temp dir before it's deleted
        $localBinary = Join-Path $env:TEMP "$BinaryName-extracted.exe"
        Copy-Item -Path $extractedBinary -Destination $localBinary -Force
        return $localBinary
    } finally {
        Log-Info "Cleaning up temporary files..."
        Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
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

# Uninstallation
function Uninstall-Binary {
    $destPath = Join-Path $DefaultInstallDir "$BinaryName.exe"
    
    if (-not (Test-Path $destPath)) {
        Log-Warn "No installation found at $destPath"
    } else {
        Log-Info "Removing binary: $destPath"
        try {
            Remove-Item -Path $destPath -Force -ErrorAction Stop
            Log-Info "Binary removed successfully."
        } catch {
            Log-Error "Failed to remove binary. It may be in use by another process."
            exit 1
        }
    }

    # PATH Cleanup
    Log-Info "Cleaning up environment PATH..."
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -split ";" -contains $DefaultInstallDir) {
        $pathList = $currentPath -split ";" | Where-Object { $_ -ne $DefaultInstallDir }
        $newPath = $pathList -join ";"
        try {
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Log-Info "PATH cleaned up. Please restart your terminal."
        } catch {
            Log-Warn "Could not update User PATH automatically."
        }
    } else {
        Log-Info "Installation directory not found in User PATH."
    }

    # Clean up empty directory
    if (Test-Path $DefaultInstallDir) {
        if ((Get-ChildItem -Path $DefaultInstallDir).Count -eq 0) {
            Log-Info "Removing empty installation directory: $DefaultInstallDir"
            Remove-Item -Path $DefaultInstallDir -Force
        }
    }

    Log-Info "Uninstallation complete."
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
    param([string]$Version, [switch]$Uninstall, [switch]$Purge, [switch]$Force)

    Write-Logo
    
    if ($Uninstall) {
        Uninstall-Binary
        if ($Purge) { Clear-PharosSecurity }
        exit 0
    }

    if ($Purge) {
        Clear-PharosSecurity
        exit 0
    }

    Log-Info "Initializing Pharos Installation Environment..."

    $platform = Get-Platform
    Check-Update -Version $Version -Force:$Force
    Audit-Environment -Force:$Force
    
    $binaryPath = Fetch-And-Verify -PlatformInfo $platform -Version $Version -Force:$Force
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

# Execution Gate
# Why: Prevents the script from executing its Main loop when dot-sourced 
#      for validation (Issue #94) or integration testing.
if ($MyInvocation.InvocationName -ne '.') {
    Main -Version:$Version -Uninstall:$Uninstall -Purge:$Purge -Force:$Force
}
