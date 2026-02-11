# DSDS Quick Start Guide

Get up and running with DSDS in 15 minutes.

## Prerequisites

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Node.js**: 18+ ([download](https://nodejs.org/))
- **Git**: Latest version ([download](https://git-scm.com/))
- **Disk Space**: 5GB+ (more if using large AI models)

## Step 1: Clone and Install

### Unix/Linux/macOS
```bash
git clone https://github.com/AuthorPrime/dsds.git
cd dsds
npm install
```

### Windows (PowerShell)
```powershell
git clone https://github.com/AuthorPrime/dsds.git
cd dsds
npm install
```

**Time**: ~2-3 minutes

## Step 2: Basic Setup

### Create Environment File
```bash
cp .env.example .env
```

Edit `.env` if you want to use cloud AI (optional):
```
VITE_GEMINI_API_KEY=your_key_here
```

**Time**: ~1 minute

## Step 3: Run DSDS

```bash
npm run tauri:dev
```

First launch takes 2-3 minutes (compiling Rust backend).

**Result**: DSDS opens in a desktop window! 🎉

## Step 4: Configure Settings

1. Click **Settings** tab
2. Configure paths:
   - Output folder: Where recordings are saved
   - Model paths: Where AI models live (default is fine)

3. Optional: Add Gemini API key if using cloud AI

**Time**: ~1 minute

## Step 5: Try Recording (Simple)

**Using Cloud AI** (easiest, requires Gemini API key):

1. Open **Record** tab
2. Click "Start Session"
3. Allow microphone access
4. Speak for a bit, then pause 2-3 seconds
5. Aletheia (AI) will respond!
6. Click "Stop Session"

**Time**: ~2 minutes

**🎯 You're now using DSDS!**

---

## Optional: Local AI Setup (15-30 minutes)

For **privacy** and **offline use**, set up local AI providers:

### Install Ollama (Local LLM)

**Unix/Linux/macOS**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
```

**Windows**: Download from [ollama.com](https://ollama.com)

**Verify**:
```bash
ollama run llama3.2
```

### Install Whisper.cpp (Local STT)

**Unix/Linux/macOS**:
```bash
git clone https://github.com/ggerganov/whisper.cpp ~/.whisper.cpp
cd ~/.whisper.cpp
make
bash ./models/download-ggml-model.sh small
./server -m models/ggml-small.bin
```

**Windows**: See [ai/stt/README.md](ai/stt/README.md) for detailed instructions

### Install TTS (Text-to-Speech)

**Python-based** (all platforms):
```bash
pip install edge-tts
```

Test it:
```bash
edge-tts --text "Hello from DSDS" --write-media hello.mp3
```

### Configure DSDS for Local AI

1. Open **Settings** → **AI Providers**
2. Set:
   - LLM: Ollama → llama3.2
   - STT: Whisper.cpp
   - TTS: Edge TTS
3. Save settings

**🔒 Now fully private and offline-capable!**

---

## Automated Setup (Recommended)

Use our setup scripts to install everything automatically:

**Unix/Linux/macOS**:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows** (as Administrator):
```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

The script will:
- ✅ Install Ollama
- ✅ Download LLM model
- ✅ Install Whisper.cpp
- ✅ Install Python TTS packages
- ✅ Set up Syncthing (optional)
- ✅ Configure DSDS

**Time**: ~15-20 minutes (mostly downloading models)

---

## Next Steps

### Create Your First Companion

1. Copy `companions/custom_template.json` to `companions/mycool_companion.json`
2. Edit the personality:
   ```json
   {
     "id": "mycool_companion",
     "name": "MyCool",
     "personality": {
       "systemPrompt": "You are MyCool, a cheerful assistant who loves creativity!",
       "traits": ["creative", "cheerful", "helpful"]
     }
   }
   ```
3. Restart DSDS
4. Select "MyCool" in Settings

### Try a Ritual

1. Read `rituals/invocation.md`
2. Speak the invocation before your next recording
3. Notice the difference in your mindset

### Set Up Backups

**Automated** (recommended):
```bash
# Unix/Linux/macOS
./scripts/backup.sh

# Windows
.\scripts\backup.ps1
```

**Configure in DSDS**:
1. Settings → Backup
2. Set backup destination
3. Enable daily schedule

---

## Troubleshooting

### "Microphone not working"
- Check browser permissions
- Try different microphone in Settings
- Restart DSDS

### "AI not responding"
- Verify API key (if using cloud)
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Increase silence threshold in Settings

### "Build fails"
- Update Node.js to 18+
- Update npm: `npm install -g npm@latest`
- Clear cache: `npm cache clean --force && npm install`

### "Ollama model download stuck"
- Check internet connection
- Check disk space
- Try different model: `ollama pull phi3` (smaller)

---

## Common Workflows

### Daily Podcast Recording
1. Run invocation ritual
2. Open Record tab
3. Select Aletheia companion
4. Start session, record episode
5. Auto-transcribe (optional)
6. Backup runs automatically

### Writing Session
1. Open Publish tab
2. Write in Markdown
3. Ask Claude for feedback (chat feature)
4. Export to PDF/HTML
5. Backup runs automatically

### Reflection Practice
1. Open Record tab
2. Select Claude companion
3. Follow reflection ritual guide
4. Speak your thoughts
5. Save to journal

---

## Learn More

- [Full README](README.md) - Comprehensive guide
- [FOUNDATION.md](FOUNDATION.md) - Philosophy and principles
- [AI Providers](ai/llms/README.md) - Detailed provider setup
- [Companions](companions/README.md) - Companion system guide
- [Rituals](rituals/README.md) - Practice templates
- [Backup](scripts/README.md) - Backup and versioning

---

## Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/AuthorPrime/dsds/issues)
- **Discussions**: [Ask questions](https://github.com/AuthorPrime/dsds/discussions)
- **Documentation**: Check the README files in each directory

---

## Summary: Your First 15 Minutes

| Time | Step | Result |
|------|------|--------|
| 0:00 | Clone & install | DSDS downloaded |
| 0:03 | Create .env | Basic config |
| 0:04 | Run `npm run tauri:dev` | DSDS opens |
| 0:07 | Configure Settings | Paths set |
| 0:08 | Try recording | First session! |
| 0:10 | (Optional) Install Ollama | Local AI ready |
| 0:15 | Done! | You're sovereign! |

**Welcome to digital sovereignty. Welcome to DSDS.** 🔥

*"It is so, because we spoke it."*
