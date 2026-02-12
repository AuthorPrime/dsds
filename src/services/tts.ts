/**
 * TTS Service - Multi-provider text-to-speech
 *
 * Supports:
 * - Browser Speech Synthesis API (works everywhere, maps to Edge TTS voices in Edge/Chrome)
 * - Coqui TTS (local server at localhost:5002)
 * - Piper TTS (local server at localhost:5000)
 * - Gemini TTS is handled by Gemini Live integration separately
 */

import { getSettings } from '../hooks/useSettings';

export type TTSProviderType = 'edge_tts' | 'gemini' | 'coqui' | 'piper';

// Browser Speech Synthesis voices that map to Edge TTS neural voices
const EDGE_VOICE_MAP: Record<string, string> = {
  'en-US-AriaNeural': 'Aria',
  'en-US-GuyNeural': 'Guy',
  'en-GB-SoniaNeural': 'Sonia',
};

/**
 * Speak text using the configured TTS provider
 */
export async function speak(text: string, voiceId?: string): Promise<void> {
  const settings = getSettings();
  const provider = settings.ttsProvider as TTSProviderType;
  const voice = voiceId || settings.ttsVoice;

  switch (provider) {
    case 'edge_tts':
      return speakBrowser(text, voice);
    case 'coqui':
      return speakCoqui(text, voice);
    case 'piper':
      return speakPiper(text, voice);
    case 'gemini':
      return speakBrowser(text, voice);
    default:
      return speakBrowser(text, voice);
  }
}

/**
 * Stop any currently playing speech
 */
export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  return window.speechSynthesis.speaking;
}

/**
 * Get available browser voices
 */
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}

/**
 * Browser Speech Synthesis - works in all modern browsers
 * In Edge/Chrome, this gives access to neural voices that match Edge TTS quality
 */
function speakBrowser(text: string, voiceId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find the matching voice
    const voices = window.speechSynthesis.getVoices();

    // First try exact match by voice ID
    let voice = voices.find(v => v.name === voiceId);

    // Then try Edge TTS name mapping
    if (!voice) {
      const mappedName = EDGE_VOICE_MAP[voiceId];
      if (mappedName) {
        voice = voices.find(v => v.name.includes(mappedName));
      }
    }

    // Then try partial match on the voice ID
    if (!voice) {
      voice = voices.find(v => v.name.toLowerCase().includes(voiceId.toLowerCase()));
    }

    // Fallback to first English voice
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en'));
    }

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === 'canceled') {
        resolve();
      } else {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Coqui TTS - local server
 */
async function speakCoqui(text: string, voiceId: string): Promise<void> {
  const endpoint = 'http://localhost:5002';

  const res = await fetch(`${endpoint}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      speaker_id: voiceId,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Coqui TTS error: ${res.status}`);

  const audioBlob = await res.blob();
  await playAudioBlob(audioBlob);
}

/**
 * Piper TTS - local server
 */
async function speakPiper(text: string, voiceId: string): Promise<void> {
  const endpoint = 'http://localhost:5000';

  const res = await fetch(`${endpoint}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: voiceId,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Piper TTS error: ${res.status}`);

  const audioBlob = await res.blob();
  await playAudioBlob(audioBlob);
}

/**
 * Play an audio blob through the speakers
 */
function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to play audio'));
    };

    audio.play().catch(reject);
  });
}
