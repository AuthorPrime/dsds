/**
 * TTS Service - Multi-provider text-to-speech
 *
 * All TTS audio routes through the TTS Audio Bridge so it can be:
 *   1. Played to speakers
 *   2. Captured in recordings (mixed with mic audio)
 *
 * Supports:
 * - Browser Speech Synthesis API (prefers neural voices in Edge/Chrome)
 * - Coqui TTS (local server at localhost:5002)
 * - Piper TTS (local server at localhost:5000)
 * - Gemini TTS is handled by Gemini Live integration separately
 */

import { getSettings } from '../hooks/useSettings';
import { playTTSBlob, speakWithCapture, stopTTSPlayback, isTTSPlaying } from './ttsAudioBridge';
import { speakWithPiper } from './piperService';

export type TTSProviderType = 'edge_tts' | 'gemini' | 'coqui' | 'piper';

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
  stopTTSPlayback();
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  return isTTSPlaying();
}

/**
 * Get available browser voices, sorted by quality (neural/natural first)
 */
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis.getVoices();
  return sortVoicesByQuality(voices);
}

// Keywords indicating a high-quality neural/natural voice
const NEURAL_KEYWORDS = ['neural', 'natural', 'online', 'premium', 'enhanced'];

/**
 * Score a voice by quality — higher is better
 */
function voiceQualityScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  // Neural/natural voices get top priority
  if (NEURAL_KEYWORDS.some(kw => name.includes(kw))) score += 100;

  // Microsoft and Google voices tend to be higher quality in Tauri/WebView
  if (name.includes('microsoft') || name.includes('google')) score += 50;

  // Edge TTS voices (Neural suffix) are excellent
  if (name.includes('neural')) score += 30;

  // English voices preferred (but don't exclude others)
  if (voice.lang.startsWith('en')) score += 10;

  // Local voices are lower quality than remote/online
  if (voice.localService) score -= 20;

  return score;
}

/**
 * Sort voices by quality score (best first)
 */
function sortVoicesByQuality(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
}

/**
 * Find the best matching voice, preferring neural/natural voices
 */
function findBestVoice(voiceId: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Exact match by name
  let voice = voices.find(v => v.name === voiceId);
  if (voice) return voice;

  // Partial match on the voice ID
  voice = voices.find(v => v.name.toLowerCase().includes(voiceId.toLowerCase()));
  if (voice) return voice;

  // Find best English neural voice as fallback
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  const sorted = sortVoicesByQuality(englishVoices);
  if (sorted.length > 0) return sorted[0];

  // Last resort: any voice
  return voices[0] || null;
}

/**
 * Browser Speech Synthesis - prefers neural voices in Edge/Chrome
 */
function speakBrowser(text: string, voiceId: string): Promise<void> {
  const voice = findBestVoice(voiceId);
  return speakWithCapture(text, voice);
}

/**
 * Coqui TTS - local server (audio routed through bridge for capture)
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
  await playTTSBlob(audioBlob);
}

/**
 * Piper TTS — tries bundled binary first, falls back to HTTP server, then browser
 */
async function speakPiper(text: string, voiceId: string): Promise<void> {
  // Try bundled Piper binary (via Tauri command)
  const usedBundled = await speakWithPiper(text, voiceId);
  if (usedBundled) return;

  // Fall back to Piper HTTP server (if user has it running externally)
  try {
    const endpoint = 'http://localhost:5000';
    const res = await fetch(`${endpoint}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceId }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const audioBlob = await res.blob();
      await playTTSBlob(audioBlob);
      return;
    }
  } catch {
    // Server not running — fall through to browser TTS
  }

  // Final fallback: browser TTS with best available voice
  console.warn('Piper TTS unavailable, falling back to browser voice');
  return speakBrowser(text, voiceId);
}
