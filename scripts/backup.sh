#!/bin/bash
#
# DSDS Backup Script (Unix/Linux/macOS)
# 
# This script backs up the DSDS Sovereign Library to configured destinations.
# It can be run manually or scheduled via cron.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSDS_ROOT="$(dirname "$SCRIPT_DIR")"
LIBRARY_PATH="$DSDS_ROOT/sovereign_library"
CONFIG_FILE="$SCRIPT_DIR/backup-config.json"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="dsds_backup_$TIMESTAMP"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v zip &> /dev/null; then
        log_error "zip is not installed. Please install zip utility."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Config parsing will be limited."
    fi
    
    log_success "Dependencies checked"
}

create_backup() {
    local dest_path=$1
    local backup_type=${2:-full}
    
    log_info "Creating $backup_type backup to: $dest_path"
    
    # Create destination directory if it doesn't exist
    mkdir -p "$dest_path"
    
    local backup_file="$dest_path/$BACKUP_NAME.zip"
    
    # Create backup archive
    cd "$DSDS_ROOT"
    
    if [ "$backup_type" == "full" ]; then
        log_info "Full backup - including all files..."
        zip -r "$backup_file" \
            sovereign_library/memories \
            sovereign_library/journal \
            sovereign_library/transcripts \
            sovereign_library/publications \
            sovereign_library/research \
            companions \
            rituals \
            .env \
            -x "sovereign_library/recordings/*.wav" \
            -x "sovereign_library/recordings/*.mp4" \
            -x "sovereign_library/backups/*" \
            -x "**/*.tmp" \
            -x "**/*.cache" \
            -x "**/node_modules/*" \
            -q
    else
        log_info "Incremental backup - only changed files..."
        # Find files modified in last 24 hours
        find sovereign_library/memories sovereign_library/journal sovereign_library/transcripts \
            -type f -mtime -1 | zip -r "$backup_file" -@ -q
    fi
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Backup created: $backup_file ($size)"
        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

git_versioning() {
    log_info "Git versioning..."
    
    cd "$LIBRARY_PATH"
    
    # Initialize git if not already
    if [ ! -d ".git" ]; then
        log_info "Initializing Git repository..."
        git init
        echo "# DSDS Sovereign Library" > README.md
        echo "recordings/" > .gitignore
        echo "backups/" >> .gitignore
        echo "*.wav" >> .gitignore
        echo "*.mp4" >> .gitignore
        git add .
        git commit -m "Initial commit"
        log_success "Git repository initialized"
    fi
    
    # Check for changes
    if [[ -n $(git status -s) ]]; then
        log_info "Changes detected, committing..."
        git add memories/ journal/ transcripts/ publications/ research/
        git commit -m "Auto-save: $(date +'%Y-%m-%d %H:%M:%S')" || true
        log_success "Changes committed to Git"
    else
        log_info "No changes to commit"
    fi
    
    cd "$DSDS_ROOT"
}

cleanup_old_backups() {
    local dest_path=$1
    local keep_count=${2:-7}
    
    log_info "Cleaning up old backups (keeping last $keep_count)..."
    
    cd "$dest_path"
    ls -t dsds_backup_*.zip | tail -n +$((keep_count + 1)) | xargs -r rm
    
    log_success "Old backups cleaned"
}

setup_syncthing() {
    log_info "Syncthing setup..."
    
    if ! command -v syncthing &> /dev/null; then
        log_warning "Syncthing is not installed"
        log_info "Install from: https://syncthing.net/"
        log_info "Or use package manager:"
        log_info "  Ubuntu/Debian: sudo apt install syncthing"
        log_info "  macOS: brew install syncthing"
        return 1
    fi
    
    log_info "Syncthing is installed"
    log_info "To configure:"
    log_info "  1. Run: syncthing"
    log_info "  2. Open web UI: http://localhost:8384"
    log_info "  3. Add folder: $LIBRARY_PATH"
    log_info "  4. Add remote devices"
    log_info "  5. Update backup-config.json with API key"
    
    return 0
}

# Main execution
main() {
    log_info "DSDS Backup Script Started"
    log_info "Timestamp: $TIMESTAMP"
    
    check_dependencies
    
    # Parse command line arguments
    BACKUP_TYPE="full"
    DEST_PATH="$LIBRARY_PATH/backups"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            -d|--destination)
                DEST_PATH="$2"
                shift 2
                ;;
            -g|--git)
                git_versioning
                exit 0
                ;;
            -s|--syncthing)
                setup_syncthing
                exit 0
                ;;
            -c|--cleanup)
                cleanup_old_backups "$DEST_PATH" 7
                exit 0
                ;;
            -h|--help)
                echo "DSDS Backup Script"
                echo ""
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  -t, --type TYPE          Backup type: full or incremental (default: full)"
                echo "  -d, --destination PATH   Backup destination path"
                echo "  -g, --git                Run git versioning only"
                echo "  -s, --syncthing          Setup Syncthing"
                echo "  -c, --cleanup            Cleanup old backups"
                echo "  -h, --help               Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                                    # Full backup to default location"
                echo "  $0 -t incremental                     # Incremental backup"
                echo "  $0 -d /mnt/backup                     # Backup to external drive"
                echo "  $0 -g                                 # Git commit only"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute backup
    create_backup "$DEST_PATH" "$BACKUP_TYPE"
    
    # Git versioning
    git_versioning
    
    # Cleanup old backups
    cleanup_old_backups "$DEST_PATH" 7
    
    log_success "Backup completed successfully!"
    log_info "Backup location: $DEST_PATH"
}

# Run main function
main "$@"
