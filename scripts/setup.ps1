# DSDS Setup Script for Windows (PowerShell)
#
# This script helps set up DSDS with local LLMs, TTS, and STT providers
#
# Run this script with: PowerShell -ExecutionPolicy Bypass -File setup.ps1
#

# Requires -RunAsAdministrator

# Colors for output
function Write-Header {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║                                                       ║" -ForegroundColor Magenta
    Write-Host "║   DSDS - Digital Sovereign Desktop Studio Setup      ║" -ForegroundColor Magenta
    Write-Host "║                                                       ║" -ForegroundColor Magenta
    Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Chocolatey {
    if (Get-Command "choco.exe" -ErrorAction SilentlyContinue) {
        Write-Success "Chocolatey already installed"
        return $true
    }
    
    Write-Info "Installing Chocolatey package manager..."
    
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        if (Get-Command "choco.exe" -ErrorAction SilentlyContinue) {
            Write-Success "Chocolatey installed successfully"
            return $true
        }
    }
    catch {
        Write-Error-Custom "Failed to install Chocolatey: $_"
        return $false
    }
    
    return $false
}

function Install-Ollama {
    Write-Info "Installing Ollama..."
    
    if (Get-Command "ollama.exe" -ErrorAction SilentlyContinue) {
        Write-Success "Ollama already installed"
        return $true
    }
    
    # Download Ollama for Windows
    $ollamaUrl = "https://ollama.com/download/OllamaSetup.exe"
    $installerPath = "$env:TEMP\OllamaSetup.exe"
    
    Write-Info "Downloading Ollama installer..."
    try {
        Invoke-WebRequest -Uri $ollamaUrl -OutFile $installerPath
        
        Write-Info "Running Ollama installer..."
        Start-Process -FilePath $installerPath -Wait
        
        if (Get-Command "ollama.exe" -ErrorAction SilentlyContinue) {
            Write-Success "Ollama installed successfully"
            
            # Start Ollama service
            Write-Info "Starting Ollama service..."
            Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep -Seconds 3
            
            return $true
        }
        else {
            Write-Error-Custom "Ollama installation may have failed. Please install manually from https://ollama.com"
            return $false
        }
    }
    catch {
        Write-Error-Custom "Failed to download/install Ollama: $_"
        Write-Info "Please install manually from https://ollama.com"
        return $false
    }
}

function Get-LLMModels {
    Write-Info "Downloading recommended LLM models..."
    
    if (-not (Get-Command "ollama.exe" -ErrorAction SilentlyContinue)) {
        Write-Error-Custom "Ollama not installed. Cannot download models."
        return $false
    }
    
    Write-Host ""
    Write-Host "Available models:"
    Write-Host "  1) llama3.2 (Recommended - 2GB)"
    Write-Host "  2) mistral (7GB)"
    Write-Host "  3) phi3 (2.3GB)"
    Write-Host "  4) Skip model download"
    Write-Host ""
    
    $choice = Read-Host "Select model to download (1-4)"
    
    switch ($choice) {
        "1" {
            Write-Info "Downloading llama3.2..."
            ollama pull llama3.2
            Write-Success "llama3.2 downloaded"
        }
        "2" {
            Write-Info "Downloading mistral..."
            ollama pull mistral
            Write-Success "mistral downloaded"
        }
        "3" {
            Write-Info "Downloading phi3..."
            ollama pull phi3
            Write-Success "phi3 downloaded"
        }
        "4" {
            Write-Info "Skipping model download"
        }
        default {
            Write-Warning "Invalid choice. Skipping model download"
        }
    }
    
    return $true
}

function Install-PythonPackages {
    Write-Info "Setting up Python-based TTS/STT..."
    
    # Check for Python
    if (-not (Get-Command "python.exe" -ErrorAction SilentlyContinue) -and 
        -not (Get-Command "python3.exe" -ErrorAction SilentlyContinue)) {
        Write-Warning "Python not found."
        
        $installPython = Read-Host "Install Python via Chocolatey? (y/n)"
        if ($installPython -eq "y") {
            choco install python -y
            refreshenv
        }
        else {
            Write-Info "Skipping Python installation. Please install from https://python.org"
            return $false
        }
    }
    
    $installPy = Read-Host "Install Python TTS/STT packages? (y/n)"
    
    if ($installPy -ne "y") {
        Write-Info "Skipping Python TTS/STT installation"
        return $false
    }
    
    # Determine Python command
    $pythonCmd = if (Get-Command "python3.exe" -ErrorAction SilentlyContinue) { "python3" } else { "python" }
    
    try {
        Write-Info "Installing Coqui TTS..."
        & $pythonCmd -m pip install --user TTS
        
        Write-Info "Installing Edge TTS..."
        & $pythonCmd -m pip install --user edge-tts
        
        Write-Info "Installing Faster Whisper..."
        & $pythonCmd -m pip install --user faster-whisper
        
        Write-Success "Python TTS/STT packages installed"
        return $true
    }
    catch {
        Write-Error-Custom "Failed to install Python packages: $_"
        return $false
    }
}

function Install-GPT4All {
    Write-Info "GPT4All installation..."
    
    $installGpt4all = Read-Host "Download GPT4All installer? (y/n)"
    
    if ($installGpt4all -ne "y") {
        Write-Info "Skipping GPT4All"
        return $false
    }
    
    Write-Info "Opening GPT4All download page..."
    Start-Process "https://gpt4all.io/index.html"
    
    Write-Info "Please download and install GPT4All manually"
    Write-Info "After installation, enable API server in GPT4All settings"
    
    return $true
}

function Install-Syncthing {
    Write-Info "Setting up Syncthing for backup sync..."
    
    if (Get-Command "syncthing.exe" -ErrorAction SilentlyContinue) {
        Write-Success "Syncthing already installed"
        return $true
    }
    
    $installSync = Read-Host "Install Syncthing? (y/n)"
    
    if ($installSync -ne "y") {
        Write-Info "Skipping Syncthing installation"
        return $false
    }
    
    try {
        choco install syncthing -y
        
        if (Get-Command "syncthing.exe" -ErrorAction SilentlyContinue) {
            Write-Success "Syncthing installed"
            Write-Info "Run 'syncthing' to start and configure"
            return $true
        }
    }
    catch {
        Write-Error-Custom "Failed to install Syncthing"
        Write-Info "Please install manually from https://syncthing.net/"
        return $false
    }
    
    return $false
}

function Initialize-DSDS {
    Write-Info "Configuring DSDS..."
    
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $DsdsRoot = Split-Path -Parent $ScriptDir
    
    Set-Location $DsdsRoot
    
    # Create .env from template
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Success "Created .env file from template"
            Write-Info "Edit .env to add your API keys"
        }
    }
    else {
        Write-Info ".env already exists"
    }
    
    # Initialize sovereign library structure
    $libraryDirs = @(
        "sovereign_library\memories\aletheia",
        "sovereign_library\memories\claude",
        "sovereign_library\journal\daily",
        "sovereign_library\journal\weekly",
        "sovereign_library\journal\archive",
        "sovereign_library\recordings\podcasts",
        "sovereign_library\recordings\sessions",
        "sovereign_library\recordings\drafts",
        "sovereign_library\transcripts",
        "sovereign_library\publications\books",
        "sovereign_library\publications\articles",
        "sovereign_library\publications\posts",
        "sovereign_library\research\pdfs",
        "sovereign_library\research\notes",
        "sovereign_library\research\links",
        "sovereign_library\backups"
    )
    
    foreach ($dir in $libraryDirs) {
        New-Item -ItemType Directory -Path $dir -Force -ErrorAction SilentlyContinue | Out-Null
    }
    
    Write-Success "Sovereign library structure created"
}

function Show-NextSteps {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host ""
    Write-Host "1. Ollama should be running. Test with:" -ForegroundColor Cyan
    Write-Host "   ollama run llama3.2"
    Write-Host ""
    Write-Host "2. Install DSDS dependencies:" -ForegroundColor Cyan
    Write-Host "   npm install"
    Write-Host ""
    Write-Host "3. Run DSDS in development:" -ForegroundColor Cyan
    Write-Host "   npm run tauri:dev"
    Write-Host ""
    Write-Host "4. Configure DSDS Settings:" -ForegroundColor Cyan
    Write-Host "   - Open Settings tab"
    Write-Host "   - Select AI providers"
    Write-Host "   - Choose companions"
    Write-Host "   - Set backup destinations"
    Write-Host ""
    Write-Host "For more information, see:"
    Write-Host "  - README.md"
    Write-Host "  - ai\llms\README.md"
    Write-Host "  - ai\tts\README.md"
    Write-Host "  - ai\stt\README.md"
    Write-Host ""
    Write-Host "Stay sovereign!" -ForegroundColor Magenta
    Write-Host ""
}

# Main execution
function Main {
    Write-Header
    
    if (-not (Test-Administrator)) {
        Write-Warning "This script should be run as Administrator for best results"
        Write-Info "Some features may not install correctly"
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            Write-Info "Setup cancelled. Please re-run as Administrator."
            exit 0
        }
    }
    
    Write-Host "This script will help you set up:"
    Write-Host "  - Chocolatey (Package manager)"
    Write-Host "  - Ollama (Local LLMs)"
    Write-Host "  - Python TTS/STT (Coqui, Edge TTS, Faster Whisper)"
    Write-Host "  - GPT4All (Optional local LLM)"
    Write-Host "  - Syncthing (Backup sync)"
    Write-Host ""
    
    $continue = Read-Host "Continue? (y/n)"
    
    if ($continue -ne "y") {
        Write-Info "Setup cancelled"
        exit 0
    }
    
    Write-Host ""
    
    # Run setup steps
    Install-Chocolatey
    Install-Ollama
    Get-LLMModels
    Install-PythonPackages
    Install-GPT4All
    Install-Syncthing
    Initialize-DSDS
    
    Show-NextSteps
}

# Run main
Main
