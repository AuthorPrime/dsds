#!/bin/bash
#
# DSDS Setup Script for Unix/Linux/macOS
#
# This script helps set up DSDS with local LLMs, TTS, and STT providers
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_header() {
    echo -e "${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║   DSDS - Digital Sovereign Desktop Studio Setup      ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log_info "Detected Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_info "Detected macOS"
    else
        log_error "Unsupported OS: $OSTYPE"
        exit 1
    fi
}

install_ollama() {
    log_info "Installing Ollama..."
    
    if command -v ollama &> /dev/null; then
        log_success "Ollama already installed"
        return 0
    fi
    
    curl -fsSL https://ollama.com/install.sh | sh
    
    if command -v ollama &> /dev/null; then
        log_success "Ollama installed successfully"
        
        # Start ollama service
        log_info "Starting Ollama service..."
        if [[ "$OS" == "linux" ]]; then
            sudo systemctl start ollama || true
        fi
        
        return 0
    else
        log_error "Ollama installation failed"
        return 1
    fi
}

download_llm_models() {
    log_info "Downloading recommended LLM models..."
    
    if ! command -v ollama &> /dev/null; then
        log_error "Ollama not installed. Cannot download models."
        return 1
    fi
    
    echo ""
    echo "Available models:"
    echo "  1) llama3.2 (Recommended - 2GB)"
    echo "  2) mistral (7GB)"
    echo "  3) phi3 (2.3GB)"
    echo "  4) Skip model download"
    echo ""
    read -p "Select model to download (1-4): " choice
    
    case $choice in
        1)
            log_info "Downloading llama3.2..."
            ollama pull llama3.2
            log_success "llama3.2 downloaded"
            ;;
        2)
            log_info "Downloading mistral..."
            ollama pull mistral
            log_success "mistral downloaded"
            ;;
        3)
            log_info "Downloading phi3..."
            ollama pull phi3
            log_success "phi3 downloaded"
            ;;
        4)
            log_info "Skipping model download"
            ;;
        *)
            log_warning "Invalid choice. Skipping model download"
            ;;
    esac
}

install_whisper_cpp() {
    log_info "Setting up Whisper.cpp for STT..."
    
    # Check if already exists
    if [ -d "$HOME/.whisper.cpp" ]; then
        log_success "Whisper.cpp already exists at $HOME/.whisper.cpp"
        return 0
    fi
    
    read -p "Install Whisper.cpp? (y/n): " install_whisper
    
    if [[ $install_whisper != "y" ]]; then
        log_info "Skipping Whisper.cpp installation"
        return 0
    fi
    
    # Clone and build
    cd "$HOME"
    git clone https://github.com/ggerganov/whisper.cpp.git .whisper.cpp
    cd .whisper.cpp
    make
    
    # Download a model
    echo ""
    echo "Whisper.cpp models:"
    echo "  1) small (Recommended - 466MB)"
    echo "  2) base (142MB)"
    echo "  3) tiny (75MB)"
    echo "  4) Skip model download"
    echo ""
    read -p "Select model to download (1-4): " choice
    
    case $choice in
        1)
            bash ./models/download-ggml-model.sh small
            log_success "Whisper small model downloaded"
            ;;
        2)
            bash ./models/download-ggml-model.sh base
            log_success "Whisper base model downloaded"
            ;;
        3)
            bash ./models/download-ggml-model.sh tiny
            log_success "Whisper tiny model downloaded"
            ;;
        *)
            log_info "Skipping model download"
            ;;
    esac
    
    cd - > /dev/null
    log_success "Whisper.cpp installed at $HOME/.whisper.cpp"
}

install_python_tts() {
    log_info "Setting up Python-based TTS/STT..."
    
    read -p "Install Python TTS/STT packages? (y/n): " install_py
    
    if [[ $install_py != "y" ]]; then
        log_info "Skipping Python TTS/STT installation"
        return 0
    fi
    
    # Check for Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 not found. Please install Python 3.8+"
        return 1
    fi
    
    # Install packages
    log_info "Installing Coqui TTS..."
    pip3 install --user TTS
    
    log_info "Installing Edge TTS..."
    pip3 install --user edge-tts
    
    log_info "Installing Faster Whisper..."
    pip3 install --user faster-whisper
    
    log_success "Python TTS/STT packages installed"
}

setup_syncthing() {
    log_info "Setting up Syncthing for backup sync..."
    
    if command -v syncthing &> /dev/null; then
        log_success "Syncthing already installed"
        return 0
    fi
    
    read -p "Install Syncthing? (y/n): " install_sync
    
    if [[ $install_sync != "y" ]]; then
        log_info "Skipping Syncthing installation"
        return 0
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Add repo and install (Debian/Ubuntu)
        if command -v apt-get &> /dev/null; then
            curl -s https://syncthing.net/release-key.txt | sudo apt-key add -
            echo "deb https://apt.syncthing.net/ syncthing stable" | sudo tee /etc/apt/sources.list.d/syncthing.list
            sudo apt-get update
            sudo apt-get install -y syncthing
        else
            log_warning "Please install Syncthing manually from: https://syncthing.net/"
        fi
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install syncthing
        else
            log_warning "Homebrew not found. Install Syncthing from: https://syncthing.net/"
        fi
    fi
    
    if command -v syncthing &> /dev/null; then
        log_success "Syncthing installed"
        log_info "Run 'syncthing' to start and configure"
    fi
}

configure_dsds() {
    log_info "Configuring DSDS..."
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    DSDS_ROOT="$(dirname "$SCRIPT_DIR")"
    
    cd "$DSDS_ROOT"
    
    # Create .env from template if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success "Created .env file from template"
            log_info "Edit .env to add your API keys"
        fi
    else
        log_info ".env already exists"
    fi
    
    # Initialize sovereign library structure
    mkdir -p sovereign_library/{memories/{aletheia,claude},journal/{daily,weekly,archive},recordings/{podcasts,sessions,drafts},transcripts,publications/{books,articles,posts},research/{pdfs,notes,links},backups}
    
    log_success "Sovereign library structure created"
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Setup Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Start Ollama (if installed):"
    echo "   ${BLUE}ollama serve${NC}"
    echo ""
    echo "2. Test Ollama with a model:"
    echo "   ${BLUE}ollama run llama3.2${NC}"
    echo ""
    echo "3. Start Whisper.cpp server (if installed):"
    echo "   ${BLUE}cd ~/.whisper.cpp && ./server -m models/ggml-small.bin${NC}"
    echo ""
    echo "4. Install DSDS dependencies:"
    echo "   ${BLUE}npm install${NC}"
    echo ""
    echo "5. Run DSDS in development:"
    echo "   ${BLUE}npm run tauri:dev${NC}"
    echo ""
    echo "6. Configure DSDS Settings:"
    echo "   - Open Settings tab"
    echo "   - Select AI providers"
    echo "   - Choose companions"
    echo "   - Set backup destinations"
    echo ""
    echo "For more information, see:"
    echo "  - README.md"
    echo "  - ai/llms/README.md"
    echo "  - ai/tts/README.md"
    echo "  - ai/stt/README.md"
    echo ""
    echo -e "${MAGENTA}Stay sovereign!${NC}"
    echo ""
}

# Main execution
main() {
    print_header
    
    check_os
    
    echo ""
    echo "This script will help you set up:"
    echo "  - Ollama (Local LLMs)"
    echo "  - Whisper.cpp (Speech-to-Text)"
    echo "  - Python TTS/STT (Coqui, Edge TTS, Faster Whisper)"
    echo "  - Syncthing (Backup sync)"
    echo ""
    read -p "Continue? (y/n): " continue_setup
    
    if [[ $continue_setup != "y" ]]; then
        log_info "Setup cancelled"
        exit 0
    fi
    
    echo ""
    
    # Run setup steps
    install_ollama
    download_llm_models
    install_whisper_cpp
    install_python_tts
    setup_syncthing
    configure_dsds
    
    print_next_steps
}

main "$@"
