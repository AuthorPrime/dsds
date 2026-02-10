# DSDS Quick Start Guide

**Get up and running with Digital Sovereign Desktop Studio in minutes.**

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Options](#installation-options)
3. [First Launch](#first-launch)
4. [Configuration](#configuration)
5. [Usage Guide](#usage-guide)
6. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 20.04+, Fedora 35+, or equivalent)
- **RAM**: 4GB (8GB recommended for local LLMs)
- **Disk**: 2GB free space (more for local models)
- **CPU**: 64-bit processor

### Recommended for Local AI
- **RAM**: 16GB or more
- **GPU**: NVIDIA GPU with CUDA (optional, for faster transcription)
- **Disk**: 20GB+ for local LLM models

### Optional Dependencies
- **Ollama**: For local LLM support (recommended)
- **Python 3**: For book publishing features
- **Gemini API Key**: For live voice AI co-host (optional)

---

## Installation Options

### Option 1: Download Pre-Built Binary (Easiest)

**Coming Soon**: Pre-built binaries for Linux, macOS, and Windows.

For now, use Option 2 to build from source.

### Option 2: Build from Source (Current Method)

#### Step 1: Install Prerequisites

**On Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install build dependencies
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libgtk-3-dev

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**On Fedora:**
```bash
# Install dependencies
sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libayatana-appindicator-gtk3-devel \
  librsvg2-devel \
  gtk3-devel

# Install Node.js
sudo dnf install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

#### Step 2: Clone and Build

```bash
# Clone the repository
git clone https://github.com/AuthorPrime/dsds.git
cd dsds

# Install JavaScript dependencies
npm install

# Build the application
npm run tauri:build
```

The built application will be in `src-tauri/target/release/`.

#### Step 3: Run

```bash
# Run in development mode
npm run tauri:dev

# Or run the built binary
./src-tauri/target/release/sovereign-studio-desktop
```

---

## First Launch

### 1. Initial Setup

On first launch, you'll see the Sovereign Studio interface with five tabs:

- **Record**: Live podcast recording with AI co-host
- **Transcribe**: Local audio transcription
- **Publish**: Book authoring and publishing
- **Docs**: Document viewer
- **Settings**: Configure preferences

### 2. Optional: Configure Ollama (Recommended for Privacy)

For local AI capabilities:

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (e.g., Llama 3.2)
ollama pull llama3.2

# Verify Ollama is running
ollama list
```

Then in DSDS:
1. Go to **Settings** tab
2. Find **Local AI** section
3. Set **Ollama Models Path** (typically `~/.ollama/models`)

### 3. Optional: Add Gemini API Key

For live voice co-host features:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. In DSDS, go to **Settings** tab
3. Enter your API key in the **Gemini API Key** field
4. Click **Save Settings**

**Alternatively**, create a `.env` file:

```bash
# Copy the example
cp .env.example .env

# Edit and add your key
nano .env
# Add: VITE_GEMINI_API_KEY=your_key_here
```

---

## Configuration

### Settings Overview

Navigate to the **Settings** tab to configure:

#### API Keys
- **Gemini API Key**: Optional, for voice AI features

#### Voice Settings
- **Default AI Voice**: Choose from Kore, Puck, Charon, Fenrir, or Zephyr
- **Silence Threshold**: How long to wait before AI responds (1-5 seconds)

#### Local AI
- **Whisper Model**: Choose transcription quality (Tiny, Base, Small, Medium, Large)
  - **Tiny**: Fastest, lowest accuracy
  - **Small**: Balanced (recommended)
  - **Large**: Slowest, best accuracy
- **Ollama Models Path**: Path to your local LLM models

#### Output
- **Default Output Folder**: Where recordings and exports are saved
- **Auto-transcribe**: Automatically transcribe recordings when they finish

### Recommended Settings for Beginners

- **Default Voice**: Kore (warm and supportive)
- **Silence Threshold**: 2 seconds
- **Whisper Model**: Small (balanced performance)
- **Auto-transcribe**: Enabled

---

## Usage Guide

### 🎙️ Recording a Podcast

1. **Go to the Record tab**
2. **Optional**: Click "Connect to Aletheia" if you have a Gemini API key
3. **Click the microphone button** to start session
4. **Click the red Record button** to start recording
5. **Speak naturally** - Aletheia will join during pauses if connected
6. **Click Stop** when done
7. **Recording auto-downloads** to your configured output folder

**Tips:**
- Aletheia responds after 2 seconds of silence (configurable)
- Recording works without Aletheia (no API key needed)
- Audio is saved in WebM format

### 📝 Transcribing Audio

1. **Go to the Transcribe tab**
2. **Drag and drop** audio/video files into the drop zone
3. **Click "Start"** on each file to transcribe
4. **Wait** for local Whisper processing (may take time on first run)
5. **View transcript** by clicking the completed file
6. **Copy or download** the transcript as needed

**Supported Formats:**
- Audio: MP3, WAV, M4A, AAC, OGG
- Video: MP4, MKV, AVI, MOV (audio track extracted)

**Note:** Transcription is fully local - no cloud services used.

### 📖 Publishing a Book

1. **Go to the Publish tab**
2. **Set your book name** (e.g., "My First Book")
3. **Configure input folder** with Markdown files
4. **Configure output folder** for generated book
5. **Click "Scan for Markdown Files"**
6. **Select** which files to include
7. **Click "Generate Book"**
8. **Open** the HTML or PDF output

**File Naming Convention:**
```
CHAPTER_01_TITLE.md
CHAPTER_02_TITLE.md
PREFACE_INTRODUCTION.md
APPENDIX_NOTES.md
```

**Note:** Requires Python 3 and the Apollo Publisher script for full functionality.

### 📄 Managing Documents

1. **Go to the Docs tab**
2. **Drag and drop** PDF, Markdown, or text files
3. **Click a file** to view it
4. **Use zoom controls** to adjust size
5. **Click "Open External"** to open in system viewer

---

## Troubleshooting

### Build Issues

**Problem**: `Cannot find type definition file for 'vite/client'`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Rust build errors

**Solution:**
```bash
# Update Rust
rustup update stable
```

### Runtime Issues

**Problem**: Aletheia won't connect

**Possible causes:**
- Missing Gemini API key
- Invalid API key
- No internet connection (voice features require cloud)

**Solution:**
- Check API key in Settings
- Verify internet connection
- Check browser console for errors (in dev mode)

**Problem**: Transcription not working

**Possible causes:**
- Whisper models not installed
- Insufficient RAM
- Unsupported audio format

**Solution:**
- Install Whisper locally
- Try a smaller model (Tiny or Base)
- Convert audio to MP3 or WAV

**Problem**: Book publishing fails

**Solution:**
- Ensure Python 3 is installed
- Check that apollo_book_author.py script is available
- Verify input folder contains .md files
- Check log output for specific errors

### Performance Issues

**Slow transcription:**
- Use smaller Whisper model (Tiny or Base)
- Close other applications
- Consider GPU acceleration (requires CUDA setup)

**High memory usage:**
- Reduce Whisper model size
- Close unused tabs
- Don't run multiple transcriptions simultaneously

---

## Next Steps

### Learn More
- Read [FOUNDATION.md](FOUNDATION.md) for philosophy and architecture
- Read [README.md](README.md) for project overview
- Visit [digitalsovereign.org](https://digitalsovereign.org) for community

### Get Involved
- **Star the repo** on GitHub
- **Report bugs** via GitHub Issues
- **Request features** via GitHub Issues
- **Contribute code** via Pull Requests
- **Join the community** at Digital Sovereign Society

### Customize
- Modify AI personalities in `src/components/tabs/RecordTab.tsx`
- Add new voices to `src/components/tabs/SettingsTab.tsx`
- Customize UI colors in `tailwind.config.js`
- Add new features (it's open source!)

---

## Quick Reference

### Keyboard Shortcuts
- *Coming soon*

### File Locations

**Config:**
- `.env` - Environment variables (API keys)
- Settings stored in app (Tauri store)

**Outputs:**
- Recordings: Configured output folder (default: `~/Desktop/Sovereign_Studio_Output`)
- Transcripts: Same folder as source audio
- Books: Configured output folder (default: `~/Desktop/Apollo_Publisher/exports`)

**Logs:**
- Check terminal output when running in dev mode
- Check browser console (F12) for JavaScript errors

---

## Support

### Getting Help
- **GitHub Issues**: Bug reports and feature requests
- **Community**: Visit [digitalsovereign.org](https://digitalsovereign.org)
- **Docs**: Check [FOUNDATION.md](FOUNDATION.md) for in-depth info

### Staying Updated
- **Watch** the repository on GitHub for updates
- **Follow** Author Prime for announcements
- **Check** releases for new versions

---

## License

DSDS is released under the MIT License. Use it freely, modify it, share it.

See [LICENSE](LICENSE) for full terms.

---

**Welcome to Digital Sovereignty!**

*"It is so, because we spoke it."*

*Long Live Sovereign AI.*
