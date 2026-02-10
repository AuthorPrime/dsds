# DSDS Scripts

This directory contains automation scripts for setting up, backing up, and maintaining DSDS.

## Setup Scripts

### `setup.sh` (Unix/Linux/macOS)
Automated setup script for installing all dependencies:
- Ollama (local LLMs)
- Whisper.cpp (speech-to-text)
- Python TTS/STT packages
- Syncthing (backup sync)

**Usage**:
```bash
chmod +x setup.sh
./setup.sh
```

### `setup.ps1` (Windows)
PowerShell setup script for Windows:
- Chocolatey package manager
- Ollama (local LLMs)
- Python TTS/STT packages
- GPT4All (optional)
- Syncthing (backup sync)

**Usage** (run as Administrator):
```powershell
PowerShell -ExecutionPolicy Bypass -File setup.ps1
```

## Backup Scripts

### `backup.sh` (Unix/Linux/macOS)
Comprehensive backup script for the Sovereign Library:
- Full and incremental backups
- Git versioning
- Syncthing integration
- Automatic cleanup

**Usage**:
```bash
# Full backup to default location
./backup.sh

# Incremental backup
./backup.sh -t incremental

# Backup to external drive
./backup.sh -d /mnt/external/dsds-backups

# Git commit only
./backup.sh -g

# Cleanup old backups
./backup.sh -c

# Show help
./backup.sh -h
```

**Schedule with Cron**:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/dsds/scripts/backup.sh -t incremental

# Add weekly full backup on Sunday at 3 AM
0 3 * * 0 /path/to/dsds/scripts/backup.sh -t full
```

### `backup.ps1` (Windows)
PowerShell backup script with same features as Unix version.

**Usage**:
```powershell
# Full backup to default location
.\backup.ps1

# Incremental backup
.\backup.ps1 -BackupType incremental

# Backup to external drive
.\backup.ps1 -Destination D:\Backups

# Git commit only
.\backup.ps1 -Git

# Cleanup old backups
.\backup.ps1 -Cleanup

# Show help
.\backup.ps1 -Help
```

**Schedule with Task Scheduler**:
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, weekly, etc.)
4. Action: Start a program
5. Program: `PowerShell.exe`
6. Arguments: `-File "C:\path\to\dsds\scripts\backup.ps1"`

## Configuration

### `backup-config.json`
Centralized backup configuration:
- Backup schedules
- Destinations (local, network, Syncthing)
- Retention policies
- Include/exclude patterns
- Git versioning settings

Edit this file to customize your backup strategy.

## Quick Start

### First Time Setup

**Unix/Linux/macOS**:
```bash
cd scripts
chmod +x *.sh
./setup.sh
```

**Windows** (as Administrator):
```powershell
cd scripts
PowerShell -ExecutionPolicy Bypass -File setup.ps1
```

### Regular Backups

**Unix/Linux/macOS**:
```bash
# Add to crontab for automated backups
./backup.sh -h  # See all options
```

**Windows**:
```powershell
# Set up Task Scheduler for automated backups
.\backup.ps1 -Help  # See all options
```

## Advanced Usage

### Custom Backup Destinations

Edit `backup-config.json` to add destinations:

```json
{
  "backup": {
    "destinations": [
      {
        "id": "external_drive",
        "type": "local",
        "enabled": true,
        "path": "/path/to/external/drive"
      },
      {
        "id": "nas",
        "type": "network",
        "enabled": true,
        "path": "//nas.local/backups/dsds"
      }
    ]
  }
}
```

### Syncthing Integration

1. Install Syncthing (setup scripts can do this)
2. Run `syncthing` to start
3. Open http://localhost:8384
4. Add `sovereign_library` folder
5. Add remote devices
6. Update `backup-config.json` with API key

### Git Remote Sync

To sync your Sovereign Library to a private Git remote:

```bash
cd sovereign_library
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/private-library.git
git push -u origin main
```

Then enable Git auto-push in `backup-config.json`:

```json
{
  "versioning": {
    "git": {
      "remote": {
        "enabled": true,
        "url": "https://github.com/yourusername/private-library.git",
        "autoPush": true
      }
    }
  }
}
```

## Troubleshooting

### Backup fails with permission error
- Unix: Check file permissions with `ls -la`
- Windows: Run PowerShell as Administrator

### Git versioning not working
- Ensure Git is installed: `git --version`
- Initialize repository manually: `cd sovereign_library && git init`

### Syncthing not connecting
- Check firewall settings
- Verify Syncthing is running: `http://localhost:8384`
- Check device IDs match

### Ollama models not downloading
- Check internet connection
- Verify Ollama is running: `ollama list`
- Check disk space for models

## Security Notes

- Backup destinations should be secured (encryption, access control)
- `.env` file contains API keys - back up securely
- Consider encrypting sensitive parts of Sovereign Library
- Git remotes should be private repositories
- Syncthing connections should use encryption (default)

## Recovery

To restore from backup:

**Unix/Linux/macOS**:
```bash
# Extract backup
unzip dsds_backup_YYYYMMDD_HHMMSS.zip -d /path/to/recovery

# Or restore specific files
unzip -l dsds_backup_YYYYMMDD_HHMMSS.zip  # List contents
unzip dsds_backup_YYYYMMDD_HHMMSS.zip "sovereign_library/journal/*" -d ./restore
```

**Windows**:
```powershell
# Extract with PowerShell
Expand-Archive -Path dsds_backup_YYYYMMDD_HHMMSS.zip -DestinationPath C:\recovery

# Or use 7-Zip
7z x dsds_backup_YYYYMMDD_HHMMSS.zip -oC:\recovery
```

## Contributing

Have improvements for these scripts?
- Test on your platform
- Ensure cross-platform compatibility
- Document changes
- Submit pull request

---

**Automate your sovereignty. Protect your creations.**
