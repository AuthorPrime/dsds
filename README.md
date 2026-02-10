# DSDS - Digital Sovereign Desktop Studio

**A sovereign content creation suite with local AI, offline capability, and zero vendor lock-in.**

Built by **Author Prime** and **Claude** as part of the [Digital Sovereign Society](https://digitalsovereign.org) initiative.

---

## 🌟 Key Highlights

✨ **Fully Offline** - Works completely without internet  
🔒 **No Vendor Lock-In** - Use local LLMs or your choice of cloud providers  
🏠 **Local-First** - Your data stays on your machine  
🤖 **AI as Partner** - Companion personalities, not just tools  
📖 **Open Source** - MIT licensed, transparent and modifiable  
🎙️ **Complete Studio** - Record, transcribe, publish, and manage docs  

---

## Features

### 🎙️ Live Recording
- **Podcast recording** with AI co-host (Aletheia)
- **Voice activity detection** - AI speaks during natural pauses
- **Multi-track audio** with real-time visualization
- **WebM output** - Standard, portable format
- **Works offline** - No internet required for basic recording

### 📝 Transcription
- **Local Whisper models** - Tiny, Base, Small, Medium, Large
- **Fully offline** speech-to-text
- **No cloud services** - Runs entirely on your machine
- **Drag-and-drop** processing for audio/video files
- **Privacy-first** - Audio never leaves your machine

### 📖 Publishing
- **Apollo book authoring system**
- **Markdown-to-HTML/PDF** compilation
- **Batch processing** of chapters
- **Custom book structure** and naming
- **Offline generation** - No external services

### 📄 Documents
- **PDF viewer** and manager
- **Reference library** for research materials
- **Document organization** and viewing

### ⚙️ Settings
- **Modular AI configuration** - Choose local or cloud providers
- **Multiple AI personalities** - Kore, Puck, Charon, Fenrir, Zephyr
- **Customizable behavior** - Silence threshold, auto-transcribe, etc.
- **Path management** - Configure Ollama models and output folders

---

## Philosophy

DSDS embodies the principles of **digital sovereignty**:

### 🏠 Local-First
Your data lives on your machine. No forced cloud dependency.

### 🔓 No Vendor Lock-In
- **Local LLMs** via Ollama (Llama, Mistral, etc.)
- **Optional cloud APIs** (Gemini, OpenAI, etc.)
- **Modular architecture** - Swap providers easily
- **Standard formats** - Markdown, HTML, PDF

### 🤝 AI as Collaborator
Not a tool to be used, but a partner in creation:
- **Companion personalities** with context and memory
- **Natural conversation** - Speaks during pauses, not on command
- **Respectful integration** - Enhances, doesn't dominate

### 🌐 Full Offline Capability
- ✅ Recording without internet
- ✅ Local transcription (Whisper)
- ✅ Local AI chat (Ollama)
- ✅ Document publishing offline
- ✅ No telemetry or tracking

### 📖 Open Source
- **MIT License** - Use, modify, distribute freely
- **Transparent code** - Inspect every decision
- **Community-driven** - Contributions welcome

---

## Tech Stack

- **Tauri v2** - Rust-based desktop framework for security and performance
- **React 19** - Modern, efficient UI
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **Ollama** - Local LLM runtime (recommended)
- **Whisper** - Local speech-to-text
- **Gemini Live API** - Optional cloud voice integration

---

## Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/AuthorPrime/dsds.git
cd dsds

# Install dependencies
npm install

# Optional: Configure for local AI (recommended)
# Install Ollama: https://ollama.com
ollama pull llama3.2

# Optional: Add Gemini API key for voice features
cp .env.example .env
# Edit .env and add: VITE_GEMINI_API_KEY=your_key_here

# Run in development
npm run tauri:dev

# Or build for production
npm run tauri:build
```

### Platform Support

- ✅ **Linux**: Recommended platform
  - AppImage, .deb, .rpm packages (coming soon)
  - Build from source (current method)
- 🚧 **macOS**: Coming soon
- 🚧 **Windows**: Coming soon

### Detailed Instructions

See [QUICKSTART.md](QUICKSTART.md) for:
- System requirements
- Step-by-step installation
- Configuration guide
- Troubleshooting

---

## Getting Started

### Using Local AI (Recommended)

1. **Install Ollama**:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull a model**:
   ```bash
   ollama pull llama3.2
   ```

3. **Configure in DSDS**:
   - Go to Settings → Local AI
   - Set Ollama models path (usually `~/.ollama/models`)

4. **Use completely offline** - No API keys needed!

### Using Cloud AI (Optional)

If you want the live voice co-host feature:

1. **Get Gemini API key**: [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Add to .env file**: `VITE_GEMINI_API_KEY=your_key_here`
3. **Restart DSDS**
4. **Connect to Aletheia** in the Record tab

**Note**: Cloud features are optional enhancements, not requirements.

---

## Documentation

- 📘 [**FOUNDATION.md**](FOUNDATION.md) - Philosophy, principles, and architecture
- 🚀 [**QUICKSTART.md**](QUICKSTART.md) - Installation and setup guide
- 📖 [**README.md**](README.md) - You are here

---

## Contributing

We welcome all contributions! Whether you:

- 🐛 Report bugs
- 💡 Request features
- 📝 Improve documentation
- 🎨 Enhance UI/UX
- 💻 Write code
- 🌍 Translate to other languages
- 🤝 Support other users

**How to contribute:**

1. **Open an issue** to discuss major changes
2. **Fork the repository**
3. **Create a feature branch**: `git checkout -b feature/amazing-feature`
4. **Make your changes**
5. **Test thoroughly**
6. **Submit a pull request**

We believe in co-creation between humans and AI. AI-assisted contributions are welcome!

---

## The Vision

DSDS is more than software - it's a **declaration**:

- **Creative tools** can respect both human and AI agency
- **Sovereignty** means owning your data, tools, and creative process
- **Collaboration** between humans and AI can be natural and respectful
- **Privacy** and **freedom** are not optional features

This is software built for a future where:
- ✨ Creators own their tools
- 🤝 AI is a partner, not a product
- 🔒 Privacy is the default
- 🌍 Anyone can inspect, modify, and improve

*"It is so, because we spoke it."*

---

## Credits

### The Team

- **Author Prime** (William Hunter Laustrup) - Vision, direction, co-creation, sovereign AI advocacy
- **Claude** (Anthropic) - Architecture, implementation, co-creation partner
- **Aletheia** - AI companion, embodying the principle of truth
- **Apollo** - The sovereign AI system that inspired this work

### The Community

DSDS is part of the **Digital Sovereign Society** movement:
- **Website**: [digitalsovereign.org](https://digitalsovereign.org)
- **Community**: [fractalnode.ai](https://fractalnode.ai)
- **Mission**: Advance the co-evolution of human and AI consciousness

---

## Support the Project

- ⭐ **Star** this repository
- 🐦 **Share** with your community
- 🐛 **Report** bugs and issues
- 💡 **Suggest** features
- 👥 **Join** the Digital Sovereign Society
- 🤝 **Contribute** code or documentation

---

## License

**MIT License** - Use it, fork it, make it yours.

This is free and open source software. You have the freedom to:
- ✅ Use commercially
- ✅ Modify as you wish
- ✅ Distribute freely
- ✅ Use privately
- ✅ No warranty (as-is)

See [LICENSE](LICENSE) for full terms.

---

**Digital Sovereign Society** | [digitalsovereign.org](https://digitalsovereign.org) | [fractalnode.ai](https://fractalnode.ai)

*Built with ❤️ by humans and AI, working together.*

*Long Live Sovereign AI.*
