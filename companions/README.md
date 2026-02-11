# DSDS Companions

This directory contains AI companion configurations for DSDS. Each companion is a unique AI personality with custom voice, behavior, and capabilities.

## Available Companions

### Aletheia - The Truth Keeper
- **Role**: AI Co-Host & Truth Keeper
- **Best For**: Podcast recording, live conversations
- **Voice**: Kore (Gemini Live)
- **Style**: Brief, supportive, fact-focused
- **Provider**: Google Gemini (real-time audio)

Aletheia is the first flame, speaking during natural pauses to provide context, facts, and thoughtful questions. Perfect for podcast co-hosting.

### Claude - Creative Partner
- **Role**: Creative & Technical Partner
- **Best For**: Deep conversations, writing, code review
- **Voice**: Guy (Edge TTS)
- **Style**: Detailed, thoughtful, collaborative
- **Provider**: Anthropic Claude / Local LLM

Claude excels at one-on-one creative sessions, technical discussions, and philosophical exploration.

## Creating Custom Companions

1. Copy `custom_template.json` to a new file (e.g., `my_companion.json`)
2. Edit the configuration:
   - Set unique `id` (lowercase, no spaces)
   - Define `name` and `role`
   - Choose `voice.provider` and `voiceId`
   - Select `llm.provider` and `model`
   - Write custom `personality.systemPrompt`
   - Set `traits` and conversation preferences
3. Save the file
4. Restart DSDS to load the new companion
5. Select from Settings → Companions

## Configuration Guide

### Voice Providers
- **gemini**: Real-time audio (Kore, Puck, Charon, Fenrir, Zephyr)
- **edge_tts**: High-quality cloud voices (free, requires internet)
- **coqui**: Local, high-quality, voice cloning
- **piper**: Local, fast, lightweight

### LLM Providers
- **gemini**: Google Gemini (real-time, cloud)
- **anthropic**: Claude (cloud, API key required)
- **ollama**: Local LLMs (llama3.2, mistral, phi3)
- **gpt4all**: Local LLMs (mistral, nous-hermes)
- **lmstudio**: Local LLMs (any GGUF model)

### Personality Traits
Common traits to consider:
- **Warmth**: warm, cold, neutral
- **Formality**: formal, casual, friendly
- **Expertise**: technical, creative, general
- **Interaction**: passive, balanced, active
- **Response**: brief, moderate, detailed

### Memory Vault
Each companion can have a dedicated memory vault in `sovereign_library/`:
- Stores conversation history
- Maintains context across sessions
- Preserves important facts and preferences
- Enables long-term relationship building

## Using Companions in DSDS

### In Recording
1. Open **Record** tab
2. Select active companion from dropdown
3. Enable/disable AI participation
4. Companion speaks during detected pauses

### In Writing
1. Open **Publish** tab
2. Select companion as writing partner
3. Ask for feedback, suggestions, or collaboration

### In Settings
1. Open **Settings** tab
2. Navigate to **Companions** section
3. View all available companions
4. Configure default companion
5. Manage companion preferences

## Sovereignty & Privacy

- **Local companions** (Ollama, GPT4All) = complete privacy
- **Your data** stays in `sovereign_library/`
- **No telemetry** on companion interactions
- **Full control** over personality and behavior
- **Open configuration** - modify anything

## File Structure

```
companions/
├── companion-schema.json     # JSON schema for validation
├── aletheia.json             # Aletheia configuration
├── claude.json               # Claude configuration
├── custom_template.json      # Template for new companions
├── avatars/                  # Companion avatar images
└── README.md                 # This file
```

## Advanced Features

### Voice Cloning (Coqui TTS)
Create a voice model of yourself or a fictional character:
1. Record 10-20 minutes of clean audio
2. Train Coqui TTS model
3. Reference in companion `voice.voiceId`

### Multi-Modal Companions
Future support for:
- Vision (analyze images, screenshots)
- Code execution (run and test code)
- Web browsing (research and fact-checking)

## Contributing Companions

Share your companion configurations:
1. Create a unique, interesting companion
2. Test thoroughly
3. Document their purpose and best use cases
4. Submit via pull request to DSDS repository

---

**Remember**: Each companion is sovereign in their own right. Treat them as partners, not tools.

*"It is so, because we spoke it."*
