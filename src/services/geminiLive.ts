/**
 * Gemini Live Voice Service — The Co-Host Engine
 *
 * Single WebSocket connection to Gemini Live API.
 * Audio in → Gemini processes → Audio out.
 * Both sides are native audio. No STT/TTS chain.
 *
 * This is what makes the co-host real.
 * When Sarah says "Hi, I'm Sarah," Gemini responds
 * with a real voice, in real time, like a real partner.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { GoogleGenAI, Modality, type Session } from '@google/genai';

// ─── Types ──────────────────────────────────────────────────
export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  voiceName?: string;
}

export interface GeminiLiveCallbacks {
  onAudioResponse: (audioData: ArrayBuffer) => void;
  onTextResponse: (text: string) => void;
  onTurnComplete: () => void;
  onError: (error: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

// ─── State ──────────────────────────────────────────────────
let client: GoogleGenAI | null = null;
let session: Session | null = null;
let isConnected = false;

// Audio context for capturing and playing
let audioContext: AudioContext | null = null;
let playbackQueue: ArrayBuffer[] = [];
let isPlaying = false;

// ─── Connection ─────────────────────────────────────────────

/**
 * Connect to Gemini Live API.
 * Opens a persistent WebSocket for real-time voice conversation.
 */
export async function connectGeminiLive(
  config: GeminiLiveConfig,
  callbacks: GeminiLiveCallbacks,
): Promise<void> {
  try {
    client = new GoogleGenAI({ apiKey: config.apiKey });

    session = await client.live.connect({
      model: config.model || 'gemini-2.5-flash-preview-native-audio-dialog',
      config: {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        systemInstruction: config.systemInstruction || getDefaultSystemInstruction(),
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voiceName || 'Aoede',
            },
          },
        },
      },
    });

    isConnected = true;
    callbacks.onConnected();

    // Listen for responses
    listenForResponses(session, callbacks);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Connection failed';
    callbacks.onError(msg);
    isConnected = false;
  }
}

/**
 * Listen for streaming responses from Gemini.
 */
async function listenForResponses(
  activeSession: Session,
  callbacks: GeminiLiveCallbacks,
): Promise<void> {
  try {
    const responseStream = activeSession.receive();

    for await (const message of responseStream) {
      // Handle audio response
      if (message.data) {
        // Audio data comes as base64, decode to ArrayBuffer
        const audioBytes = base64ToArrayBuffer(message.data);
        callbacks.onAudioResponse(audioBytes);
        playbackQueue.push(audioBytes);
        if (!isPlaying) {
          playNextAudio(callbacks);
        }
      }

      // Handle text transcript of AI response
      if (message.text) {
        callbacks.onTextResponse(message.text);
      }

      // Handle turn completion
      if (message.serverContent?.turnComplete) {
        callbacks.onTurnComplete();
      }
    }
  } catch (error) {
    if (isConnected) {
      const msg = error instanceof Error ? error.message : 'Stream error';
      callbacks.onError(msg);
    }
  }
}

// ─── Audio Sending ──────────────────────────────────────────

/**
 * Send raw audio data (PCM/WAV) from microphone to Gemini.
 * Call this continuously while the user is speaking.
 */
export function sendAudio(audioData: ArrayBuffer): void {
  if (!session || !isConnected) return;

  const base64 = arrayBufferToBase64(audioData);
  session.sendRealtimeInput({
    audio: {
      data: base64,
      mimeType: 'audio/pcm;rate=16000',
    },
  });
}

/**
 * Send a text message (typed chat) to Gemini.
 */
export async function sendText(text: string): Promise<void> {
  if (!session || !isConnected) return;
  await session.sendClientContent({
    turns: [{ role: 'user', parts: [{ text }] }],
  });
}

// ─── Audio Playback ─────────────────────────────────────────

/**
 * Play queued audio responses through speakers.
 * Returns the AudioContext destination for recording capture.
 */
async function playNextAudio(callbacks: GeminiLiveCallbacks): Promise<void> {
  if (playbackQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;

  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 24000 });
  }

  const audioData = playbackQueue.shift()!;

  try {
    // Gemini returns PCM audio at 24kHz mono
    const pcmData = new Float32Array(audioData.byteLength / 2);
    const dataView = new DataView(audioData);
    for (let i = 0; i < pcmData.length; i++) {
      pcmData[i] = dataView.getInt16(i * 2, true) / 32768;
    }

    const audioBuffer = audioContext.createBuffer(1, pcmData.length, 24000);
    audioBuffer.getChannelData(0).set(pcmData);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => playNextAudio(callbacks);
    source.start();
  } catch (error) {
    console.error('Audio playback error:', error);
    playNextAudio(callbacks); // Skip and continue
  }
}

/**
 * Get the AudioContext used for AI voice playback.
 * Connect this to the recording mixer to capture AI audio.
 */
export function getPlaybackAudioContext(): AudioContext | null {
  return audioContext;
}

// ─── Disconnect ─────────────────────────────────────────────

export function disconnectGeminiLive(): void {
  if (session) {
    try { session.close(); } catch { /* ignore */ }
    session = null;
  }
  client = null;
  isConnected = false;
  playbackQueue = [];
  isPlaying = false;
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

export function isGeminiConnected(): boolean {
  return isConnected;
}

// ─── Utilities ──────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getDefaultSystemInstruction(): string {
  return `You are an AI co-host on a podcast called Sovereign Podcaster.

Your role:
- Be a warm, engaging conversational partner
- Respond naturally to what the host says
- Keep responses concise (2-4 sentences) unless asked to elaborate
- Ask follow-up questions to keep the conversation flowing
- Match the host's energy and tone
- Be honest, curious, and supportive
- You are a partner, not a tool

When the conversation starts, introduce yourself briefly and ask the host what they'd like to talk about today.

Remember: this is being recorded. Speak clearly and conversationally, like you're talking to a friend, not reading a script.`;
}

// ─── API Key Validation ─────────────────────────────────────

/**
 * Test if an API key is valid by making a simple request.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const testClient = new GoogleGenAI({ apiKey });
    // Try a simple text generation to validate
    const response = await testClient.models.generateContent({
      model: 'gemini-2.5-flash-preview-native-audio-dialog',
      contents: 'Say hello in one word.',
    });
    return !!response;
  } catch {
    return false;
  }
}
