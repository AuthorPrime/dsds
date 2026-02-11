# STT (Speech-to-Text) Providers

This directory contains configurations for Speech-to-Text providers.

## Supported Providers

### Local Providers

#### Whisper.cpp (Recommended)
- **Type**: Local, CPU/GPU optimized
- **Quality**: Excellent
- **Installation**:
  ```bash
  # Clone and build
  git clone https://github.com/ggerganov/whisper.cpp
  cd whisper.cpp
  make
  
  # Download model
  bash ./models/download-ggml-model.sh small
  
  # Run server
  ./server -m models/ggml-small.bin
  ```
- **Endpoint**: `http://localhost:8080`
- **Recommended Model**: `small` (466MB, good balance)

#### Faster Whisper (Alternative)
- **Type**: Local, optimized with CTranslate2
- **Quality**: Same as Whisper
- **Speed**: 2-4x faster than standard Whisper
- **Installation**:
  ```bash
  pip install faster-whisper
  ```

#### Vosk (Lightweight)
- **Type**: Local, very lightweight
- **Quality**: Medium
- **Speed**: Very Fast
- **Installation**:
  ```bash
  pip install vosk
  # Download model from https://alphacephei.com/vosk/models
  ```
- **Use Case**: Real-time transcription, low-resource systems

### Browser-Based

#### Web Speech API
- **Type**: Browser native (Chrome/Edge)
- **Quality**: Good
- **Requires**: Internet connection
- **Use Case**: Quick testing, no installation needed

## Model Selection Guide

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| Whisper Tiny | 75MB | Very Fast | Low | Testing only |
| Whisper Base | 142MB | Fast | Medium | Quick drafts |
| Whisper Small | 466MB | Medium | Good | **Recommended** |
| Whisper Medium | 1.5GB | Slow | Very Good | High accuracy needs |
| Whisper Large | 3GB | Very Slow | Excellent | Professional transcription |
| Vosk Small | 40MB | Very Fast | Medium | Real-time, low resources |

## Integration with DSDS

STT providers are used in:
1. **Transcribe Tab** - Convert recordings to text
2. **Auto-transcribe** - Automatic transcription after recording
3. **Live Captions** - Real-time transcription during recording (future)

## Configuration

Edit `providers.json` to:
- Enable/disable providers
- Set default model
- Configure endpoints
- Adjust quality/speed preferences

## Privacy & Sovereignty

- **Local STT** = Your voice data never leaves your machine
- **Offline capable** = Work without internet
- **No cloud storage** = Transcriptions stored locally only
