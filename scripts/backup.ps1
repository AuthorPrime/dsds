# DSDS Backup Script (Windows PowerShell)
#
# This script backs up the DSDS Sovereign Library to configured destinations.
# It can be run manually or scheduled via Task Scheduler.
#

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("full", "incremental")]
    [string]$BackupType = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$Destination = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Git,
    
    [Parameter(Mandatory=$false)]
    [switch]$Cleanup,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Script configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DsdsRoot = Split-Path -Parent $ScriptDir
$LibraryPath = Join-Path $DsdsRoot "sovereign_library"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "dsds_backup_$Timestamp"

# Colors for console output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Help {
    Write-Host "DSDS Backup Script (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\backup.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -BackupType <type>       Backup type: full or incremental (default: full)"
    Write-Host "  -Destination <path>      Backup destination path"
    Write-Host "  -Git                     Run git versioning only"
    Write-Host "  -Cleanup                 Cleanup old backups"
    Write-Host "  -Help                    Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\backup.ps1                                    # Full backup to default location"
    Write-Host "  .\backup.ps1 -BackupType incremental            # Incremental backup"
    Write-Host "  .\backup.ps1 -Destination D:\Backups            # Backup to external drive"
    Write-Host "  .\backup.ps1 -Git                               # Git commit only"
    exit 0
}

function Test-Dependencies {
    Write-Info "Checking dependencies..."
    
    # Check for 7-Zip or Compress-Archive
    $hasCompression = $true
    if (-not (Get-Command "7z.exe" -ErrorAction SilentlyContinue)) {
        Write-Warning "7-Zip not found. Will use PowerShell Compress-Archive (slower)"
    }
    
    Write-Success "Dependencies checked"
}

function New-Backup {
    param(
        [string]$DestPath,
        [string]$Type = "full"
    )
    
    Write-Info "Creating $Type backup to: $DestPath"
    
    # Create destination directory if it doesn't exist
    if (-not (Test-Path $DestPath)) {
        New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
    }
    
    $BackupFile = Join-Path $DestPath "$BackupName.zip"
    
    # Define paths to backup
    $PathsToBackup = @(
        "sovereign_library\memories",
        "sovereign_library\journal",
        "sovereign_library\transcripts",
        "sovereign_library\publications",
        "sovereign_library\research",
        "companions",
        "rituals"
    )
    
    # Add .env if it exists
    if (Test-Path (Join-Path $DsdsRoot ".env")) {
        $PathsToBackup += ".env"
    }
    
    Set-Location $DsdsRoot
    
    try {
        if ($Type -eq "full") {
            Write-Info "Full backup - including all files..."
            
            # Use 7-Zip if available, otherwise PowerShell
            if (Get-Command "7z.exe" -ErrorAction SilentlyContinue) {
                $excludeArgs = @(
                    "-x!sovereign_library\recordings\*.wav",
                    "-x!sovereign_library\recordings\*.mp4",
                    "-x!sovereign_library\backups\*",
                    "-x!**\*.tmp",
                    "-x!**\*.cache",
                    "-x!*\node_modules\*"
                )
                
                & 7z.exe a -tzip $BackupFile $PathsToBackup $excludeArgs -mx6 | Out-Null
            }
            else {
                # Collect files to compress
                $filesToCompress = @()
                foreach ($path in $PathsToBackup) {
                    $fullPath = Join-Path $DsdsRoot $path
                    if (Test-Path $fullPath) {
                        $filesToCompress += Get-ChildItem -Path $fullPath -Recurse -File |
                            Where-Object {
                                $_.Extension -notin @('.wav', '.mp4', '.tmp', '.cache') -and
                                $_.FullName -notmatch 'node_modules' -and
                                $_.FullName -notmatch 'backups'
                            }
                    }
                }
                
                Compress-Archive -Path $filesToCompress.FullName -DestinationPath $BackupFile -CompressionLevel Optimal
            }
        }
        else {
            Write-Info "Incremental backup - only changed files..."
            
            # Find files modified in last 24 hours
            $recentFiles = Get-ChildItem -Path $LibraryPath -Recurse -File |
                Where-Object {
                    $_.LastWriteTime -gt (Get-Date).AddDays(-1) -and
                    $_.Extension -notin @('.wav', '.mp4', '.tmp', '.cache')
                }
            
            if ($recentFiles.Count -gt 0) {
                Compress-Archive -Path $recentFiles.FullName -DestinationPath $BackupFile -CompressionLevel Optimal
            }
            else {
                Write-Warning "No files modified in last 24 hours"
                return $false
            }
        }
        
        if (Test-Path $BackupFile) {
            $size = (Get-Item $BackupFile).Length / 1MB
            Write-Success "Backup created: $BackupFile ($([math]::Round($size, 2)) MB)"
            return $true
        }
        else {
            Write-Error-Custom "Backup failed"
            return $false
        }
    }
    catch {
        Write-Error-Custom "Backup error: $_"
        return $false
    }
}

function Invoke-GitVersioning {
    Write-Info "Git versioning..."
    
    Set-Location $LibraryPath
    
    # Initialize git if not already
    if (-not (Test-Path ".git")) {
        Write-Info "Initializing Git repository..."
        git init
        "# DSDS Sovereign Library" | Out-File README.md
        @("recordings/", "backups/", "*.wav", "*.mp4") | Out-File .gitignore
        git add .
        git commit -m "Initial commit"
        Write-Success "Git repository initialized"
    }
    
    # Check for changes
    $gitStatus = git status --short
    if ($gitStatus) {
        Write-Info "Changes detected, committing..."
        git add memories/ journal/ transcripts/ publications/ research/
        git commit -m "Auto-save: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 2>&1 | Out-Null
        Write-Success "Changes committed to Git"
    }
    else {
        Write-Info "No changes to commit"
    }
    
    Set-Location $DsdsRoot
}

function Remove-OldBackups {
    param(
        [string]$DestPath,
        [int]$KeepCount = 7
    )
    
    Write-Info "Cleaning up old backups (keeping last $KeepCount)..."
    
    Get-ChildItem -Path $DestPath -Filter "dsds_backup_*.zip" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $KeepCount |
        Remove-Item -Force
    
    Write-Success "Old backups cleaned"
}

function Setup-Syncthing {
    Write-Info "Syncthing setup..."
    
    if (-not (Get-Command "syncthing.exe" -ErrorAction SilentlyContinue)) {
        Write-Warning "Syncthing is not installed"
        Write-Info "Install from: https://syncthing.net/"
        Write-Info "Or use: choco install syncthing"
        return $false
    }
    
    Write-Info "Syncthing is installed"
    Write-Info "To configure:"
    Write-Info "  1. Run: syncthing.exe"
    Write-Info "  2. Open web UI: http://localhost:8384"
    Write-Info "  3. Add folder: $LibraryPath"
    Write-Info "  4. Add remote devices"
    Write-Info "  5. Update backup-config.json with API key"
    
    return $true
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
    }
    
    Write-Info "DSDS Backup Script Started"
    Write-Info "Timestamp: $Timestamp"
    
    Test-Dependencies
    
    # Git only
    if ($Git) {
        Invoke-GitVersioning
        exit 0
    }
    
    # Cleanup only
    if ($Cleanup) {
        $destPath = if ($Destination) { $Destination } else { Join-Path $LibraryPath "backups" }
        Remove-OldBackups -DestPath $destPath -KeepCount 7
        exit 0
    }
    
    # Set destination
    $destPath = if ($Destination) { $Destination } else { Join-Path $LibraryPath "backups" }
    
    # Execute backup
    New-Backup -DestPath $destPath -Type $BackupType
    
    # Git versioning
    Invoke-GitVersioning
    
    # Cleanup old backups
    Remove-OldBackups -DestPath $destPath -KeepCount 7
    
    Write-Success "Backup completed successfully!"
    Write-Info "Backup location: $destPath"
}

# Run main function
Main
