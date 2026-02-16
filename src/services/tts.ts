/**
 * TTS Service — Built-in neural text-to-speech (Piper)
 *
 * All TTS audio routes through the TTS Audio Bridge so it can be:
 *   1. Played to speakers
 *   2. Captured in recordings (mixed with mic audio)
 *
 * Uses Piper TTS (neural voices, runs locally).
 * Falls back silently to browser speechSynthesis if Piper isn't installed yet.
 */

import { getSettings } from '../hooks/useSettings';
import { speakWithCapture, stopTTSPlayback, isTTSPlaying } from './ttsAudioBridge';
import { speakWithPiper } from './piperService';

/**
 * Speak text using the built-in voice engine
 */
export async function speak(text: string, voiceId?: string): Promise<void> {
  const settings = getSettings();
  const voice = voiceId || settings.ttsVoice;

  // Try Piper first (neural voice)
  const usedPiper = await speakWithPiper(text, voice);
  if (usedPiper) return;

  // Silent fallback to browser voice if Piper isn't installed yet
  return speakBrowserFallback(text);
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
 * Silent browser fallback — used only when Piper isn't installed yet.
 * Picks the best available system voice automatically.
 */
function speakBrowserFallback(text: string): Promise<void> {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return speakWithCapture(text, null);

  // Find best English voice
  const english = voices.filter(v => v.lang.startsWith('en'));
  const sorted = [...(english.length > 0 ? english : voices)].sort((a, b) => {
    const aScore = voiceScore(a);
    const bScore = voiceScore(b);
    return bScore - aScore;
  });

  return speakWithCapture(text, sorted[0] || null);
}

function voiceScore(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (['neural', 'natural', 'online', 'premium'].some(kw => name.includes(kw))) score += 100;
  if (name.includes('microsoft') || name.includes('google')) score += 50;
  if (v.lang.startsWith('en')) score += 10;
  if (v.localService) score -= 20;
  return score;
}
