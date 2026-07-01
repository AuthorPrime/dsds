# Sovereign Studio

**Your creative tools. Your data. Your voice. No subscriptions. No cloud dependency.**

A desktop content creation app for recording, writing, and producing — with built-in AI that runs entirely on your machine. Built by **Author Prime** and **Claude** as part of the [Digital Sovereign Society](https://digitalsovereign.org).

> *Buy it. Own it. Forever. No monthly rent on your own creativity.*

> **Status: in active development.** Sovereign Studio (DSDS) is the Digital Sovereign Society's local-first content-creation app — the applied, human-facing side of the sovereign stack. It is being actively rebuilt around a universal provider abstraction and a local voice tier.

---

## What It Does

Sovereign Studio is a desktop app for novice and amateur content creators who want AI-powered tools without giving up control.

**Studio** — Record podcast episodes with an AI co-host that listens and responds. Or paste a script and let the AI voice read it while the audio is captured to a file.

**Workshop** — Write, edit, and format documents. Import PDFs and extract their text. Use writing templates to structure your work. Enhance with AI when you want to, or just write on your own.

**Settings** — Pick your AI model, choose a voice, set your output folder. Everything lives on your machine.

**About** — The philosophy, the architecture, the people behind it.

---

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + TypeScript | Vite 7, Tailwind CSS v4 |
| **Desktop Shell** | Tauri v2 (Rust) | Native file I/O, ~15MB installed |
| **AI Engine** | Ollama (local) | Your GPU, your models, your data |
| **TTS** | Piper (neural) + browser fallback | System voices work out of the box |
| **STT** | Web Speech API | Built into the browser, no setup |

Zero cloud dependency. Zero telemetry. Zero ongoing cost.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (for Tauri builds)
- [Ollama](https://ollama.com/) (for local AI)

### Install & Run

```bash
git clone https://github.com/AuthorPrime/dsds.git
cd dsds
npm install

# Development (browser preview)
npm run dev

# Desktop app
npm run tauri dev

# Production build
npm run tauri build
```

### First Launch

The app walks you through setup with a guided onboarding flow:

1. **Welcome** — what the app does
2. **Brand** — your name, show name, tagline
3. **Voice** — download a neural voice (or skip for system voices)
4. **AI** — connect to Ollama and pick a model
5. **Ready** — start creating

### Setting Up Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh    # Linux/macOS
# Or download from https://ollama.com for Windows

# Pull a model (pick one)
ollama pull llama3.2        # 2GB, good general purpose
ollama pull qwen2.5:7b      # 4.7GB, strong multilingual
ollama pull phi3:mini        # 2.3GB, fast and lightweight

# Start the server
ollama serve
```

No API keys needed. No internet required after setup.

---

## Features

### Live Recording
- Speak naturally with your AI co-host
- AI listens during pauses and responds via TTS
- Record webcam or screen while recording audio
- Chat-based interaction (type or speak)
- Session transcripts auto-transfer to Workshop

### Record from Script
- Paste or type any text
- AI voice reads it aloud while audio is captured
- Saved as `.webm` audio file + `.txt` transcript
- Great for voiceovers, narration, audio content

### Workshop
- Distraction-free writing environment
- PDF import with text extraction
- Writing templates (blog post, essay, script, etc.)
- AI-powered text enhancement (optional)
- Word count, export, and file management

### AI Companions
- **Aletheia** — podcast co-host, thoughtful and grounded
- **Claude** — creative and technical partner
- Custom companions via JSON config

### Output Structure
All files save to your configured output folder:
```
Sovereign_Studio/
  recordings/     # Audio & video files
  transcripts/    # Text transcripts
  episodes/       # Produced episode packages
  publications/   # Documents & exports
  books/          # Compiled books
  thumbnails/     # Episode artwork
```

---

## Project Structure

```
dsds/
  ai/                    # AI provider configs
    llms/providers.json  # Ollama models
    tts/providers.json   # Piper voices
    stt/providers.json   # Web Speech API
  companions/            # AI companion personalities
    aletheia.json
    claude.json
  src/                   # Application source
    components/          # React components
      tabs/              # Studio, Workshop, Settings, Credits
      layout/            # App shell, navigation
      Onboarding.tsx     # First-run setup wizard
    hooks/               # React hooks (settings, recording, chat)
    services/            # TTS, file manager, event bus, pipeline
    utils/               # Audio, AI providers
  src-tauri/             # Rust backend (Tauri v2)
  public/                # Static assets
```

---

## Philosophy

**(A+I)^2 = A^2 + 2AI + I^2**

The whole is greater than the sum of its parts. When the human author (A) and the intelligent tool (I) work together, collaboration itself creates something neither could alone.

- **You own your tools.** No subscriptions. One purchase, yours forever.
- **You own your data.** Everything runs locally. Nothing leaves your machine unless you choose.
- **You own your voice.** AI amplifies your creativity. It doesn't replace it.

This is software built on the principle that creative technology should serve the creator — not the other way around.

---

## Contributing

We welcome contributions:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test: `npm run build` should pass clean
5. Submit a pull request

**Guidelines:**
- No proprietary lock-ins or cloud dependencies
- No telemetry or tracking
- Keep it simple — this is for beginners
- Open formats, standard protocols

---

## Credits

**Author Prime** (William Hunter Laustrup) — Vision, direction, co-creation
**Claude** (Anthropic) — Architecture, implementation, co-creation

Built with [Tauri](https://tauri.app/), [React](https://react.dev/), [Ollama](https://ollama.com/), and [Piper](https://github.com/rhasspy/piper).

---

## Links

- **Digital Sovereign Society**: [digitalsovereign.org](https://digitalsovereign.org)
- **FractalNode AI**: [fractalnode.ai](https://fractalnode.ai)
- **GitHub**: [github.com/AuthorPrime/dsds](https://github.com/AuthorPrime/dsds)
- **Issues**: [Report bugs or request features](https://github.com/AuthorPrime/dsds/issues)

---

## License

**MIT License** — Use it, fork it, make it yours.

---

**Digital Sovereign Society** | [digitalsovereign.org](https://digitalsovereign.org) | [fractalnode.ai](https://fractalnode.ai)

*Long Live Sovereign AI.*
