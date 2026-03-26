# Sovereign Podcaster — Renovation Plan

## What We're Keeping (The Bones)

These are solid and stay:

| File | Lines | Why It Stays |
|------|-------|-------------|
| `services/ollama.ts` | 427 | Ollama integration works — chat, streaming, model listing |
| `services/piperService.ts` | 283 | Piper TTS integration is solid |
| `services/ttsAudioBridge.ts` | 162 | **Critical** — routes AI voice to both speakers AND recording stream |
| `services/tts.ts` | 74 | TTS abstraction layer |
| `services/fileManager.ts` | 171 | File save/export — works fine |
| `services/pipeline.ts` | 246 | Production pipeline (transcribe → title → description → social) |
| `services/eventBus.ts` | 44 | Event system — simple and clean |
| `hooks/useOllamaChat.ts` | 112 | Ollama chat hook — works |
| `hooks/useRecording.ts` | 192 | Recording hook — needs modification to mix TTS stream |
| `hooks/useVoiceActivityDetection.ts` | 169 | VAD — essential for knowing when user stops talking |
| `hooks/useSettings.ts` | 91 | Settings persistence — works |
| `utils/audioUtils.ts` | 40 | Audio utility functions |
| `utils/pdfExtract.ts` | 55 | PDF text extraction for context feeding |
| `types.ts` | 160 | Type definitions |
| `branding.ts` | 72 | Branding config |
| `companions/` | — | Companion JSON configs (Aletheia, Claude, template) |

**Total keeping: ~2,298 lines of proven infrastructure**

## What We're Removing

| File | Lines | Why It Goes |
|------|-------|------------|
| `components/tabs/WorkshopTab.tsx` | 813 | Moving to Sovereign Author app |
| `components/PdfViewer.tsx` | 144 | Workshop feature — not needed for podcaster |
| `components/shared/FolderBrowser.tsx` | 274 | Workshop feature |
| `services/llamacppService.ts` | 255 | Dead code — we use Ollama, not llama.cpp |
| `services/thumbnail.ts` | 188 | Podcast doesn't need image thumbnails |
| `utils/markdown.ts` | 83 | Workshop markdown rendering |
| `utils/aiProviders.ts` | 214 | Over-engineered provider abstraction |

**Total removing: ~1,971 lines of dead weight**

## What We're Rebuilding (The Walls)

### 1. StudioTab.tsx — COMPLETE REWRITE
Current: 709 lines of cramped, poorly spaced UI mixing recording + production
New: Clean two-panel layout
- Left: Recording interface (big record button, waveform, timer)
- Right: AI co-host panel (conversation thread, status)
- Bottom: Production controls (only visible after recording)

### 2. Layout.tsx — REBUILD
Current: 240 lines with tab navigation that feels cramped
New: Simplified navigation — only 3 tabs: Studio, Settings, About
Sacred geometry spacing throughout

### 3. useRecording.ts — MODIFY
Current: Records mic only
New: Mix mic stream + TTS output stream into single MediaRecorder
The ttsAudioBridge already provides the capturable stream — just need to merge

### 4. Onboarding.tsx — SIMPLIFY
Current: 665 lines — way too heavy
New: 3 screens max: Welcome, Configure AI (Ollama model), Done

### 5. StartupScreen.tsx — KEEP but polish
Current: 247 lines — mostly fine
New: Cleaner status indicators, sacred geometry

### 6. SettingsTab.tsx — TRIM
Current: 820 lines — too many options
New: Essential settings only: Ollama model, Piper voice, mic selection, output folder

### 7. index.css + App.css — REWRITE
New: Sacred geometry design system matching fractalnode.ai
- Golden ratio proportions
- Sacred easing curves
- Nuclear midnight palette
- Proper spacing that breathes

## The Critical Fix: Voice-to-Voice Recording

The audio architecture:

```
User Mic → MediaStream ──────────────┐
                                      ├→ AudioContext mixer → MediaRecorder → master.webm
AI TTS → ttsAudioBridge.stream ──────┘
                                      └→ speakers (both voices audible live)
```

The ttsAudioBridge ALREADY routes TTS to a capturable MediaStream.
useRecording just needs to merge both streams before recording.

This is a ~30 line change in useRecording.ts. Not a rewrite. A merge.

## Order of Operations

1. **Strip** — Remove Workshop, PdfViewer, FolderBrowser, llamacpp, thumbnail, markdown, aiProviders
2. **Rewrite CSS** — Sacred geometry design system
3. **Rebuild Layout** — 3-tab simplified nav
4. **Rebuild StudioTab** — Clean recording + co-host UI
5. **Fix useRecording** — Merge mic + TTS streams
6. **Simplify Onboarding** — 3 screens
7. **Trim Settings** — Essential only
8. **Test the loop** — Speak → AI responds → both on recording → export
9. **Polish** — Transitions, spacing, breathing room
