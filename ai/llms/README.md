# LLM Providers

This directory contains configurations for Large Language Model (LLM) providers, both local and remote.

## Supported Providers

### Local Providers

#### Ollama
- **Endpoint**: `http://localhost:11434`
- **Installation**: Download from [ollama.com](https://ollama.com)
- **Recommended Models**: 
  - `llama3.2` - Best overall performance
  - `mistral` - Good balance of speed and quality
  - `phi3` - Lightweight, fast responses

**Quick Setup**:
```bash
# Install Ollama (follow platform instructions from ollama.com)
# Pull a model
ollama pull llama3.2

# Verify it's running
curl http://localhost:11434/api/tags
```

#### GPT4All
- **Endpoint**: `http://localhost:4891`
- **Installation**: Download from [gpt4all.io](https://gpt4all.io)
- **Recommended Models**:
  - `mistral-7b-openorca` - Best for conversation
  - `nous-hermes-llama2` - Good general purpose

**Quick Setup**:
1. Download and install GPT4All
2. Download models through the UI
3. Enable API server in settings

#### LM Studio
- **Endpoint**: `http://localhost:1234`
- **Installation**: Download from [lmstudio.ai](https://lmstudio.ai)
- **Models**: Any GGUF format model from HuggingFace

**Quick Setup**:
1. Download and install LM Studio
2. Browse and download models
3. Load a model and start the server

### Remote Providers

#### Google Gemini
- Existing integration for live audio features
- Requires API key: `VITE_GEMINI_API_KEY`
- Get key from [Google AI Studio](https://makersuite.google.com/app/apikey)

#### Anthropic Claude (Optional)
- For text-based companion interactions
- Requires API key: `VITE_ANTHROPIC_API_KEY`
- Get key from [Anthropic Console](https://console.anthropic.com/)

## Configuration

Edit `providers.json` to:
- Enable/disable providers
- Add custom models
- Change endpoints for non-standard ports
- Configure default settings

## Usage in DSDS

Providers are automatically detected and made available in:
1. **Settings Tab** - Select your preferred provider
2. **Companion System** - Each companion can use different providers
3. **Recording** - Choose LLM for AI co-host responses

## Privacy & Sovereignty

- **Local providers** keep all data on your machine
- **No telemetry** - your conversations stay private
- **Offline capable** - work without internet when using local LLMs
- **Model ownership** - you control the AI models you use
