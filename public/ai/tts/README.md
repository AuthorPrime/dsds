# TTS (Text-to-Speech) Providers

This directory contains configurations for Text-to-Speech providers.

## Supported Providers

### Local Providers

#### Coqui TTS (Recommended for Quality)
- **Type**: Local, Open Source
- **Quality**: High
- **Features**: Voice cloning, multi-speaker
- **Installation**:
  ```bash
  pip install TTS
  tts-server --model_name tts_models/en/ljspeech/tacotron2-DDC
  ```
- **Endpoint**: `http://localhost:5002`

#### Piper TTS (Recommended for Speed)
- **Type**: Local, Lightweight
- **Quality**: Medium
- **Speed**: Very Fast
- **Installation**: Download from [Rhasspy Piper](https://github.com/rhasspy/piper)
- **Endpoint**: `http://localhost:5000`

#### Edge TTS (Hybrid)
- **Type**: Cloud-based via local API
- **Quality**: High
- **Requires**: Internet connection
- **Installation**:
  ```bash
  pip install edge-tts
  edge-tts --list-voices
  ```
- **Note**: Free to use, powered by Microsoft Edge

### Remote Providers

#### Gemini Live Audio
- Existing DSDS integration
- Real-time bidirectional voice
- Requires API key

## Voice Mapping for Companions

Each companion can have a preferred voice:
- **Aletheia** → Kore (Gemini) / Aria (Edge TTS)
- **Claude** → Guy (Edge TTS) / Lessac (Piper)
- **Custom companions** → Configure in companion profile

## Usage

1. Install your preferred TTS provider
2. Start the TTS server
3. Configure in DSDS Settings → Voice
4. Select voice for each companion

## Sovereignty Notes

- **Local TTS** = Complete privacy, offline capable
- **Edge TTS** = Free but requires internet
- **Gemini** = Requires API key, best for real-time conversation
