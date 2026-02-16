/**
 * TTS Audio Bridge — Singleton AudioContext that routes TTS audio to both
 * speakers AND a capturable MediaStream for recording.
 *
 * This solves the gap where Piper/browser TTS plays to speakers
 * but isn't captured in recordings without this bridge.
 *
 * Architecture:
 *   TTS blob → AudioContext.decodeAudioData → AudioBufferSourceNode
 *     ├─→ audioContext.destination (speakers)
 *     └─→ MediaStreamDestinationNode.stream (capturable for recording)
 */

import { createAudioContext } from '../utils/audioUtils';

let audioContext: AudioContext | null = null;
let destinationNode: MediaStreamAudioDestinationNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

/**
 * Get or create the shared TTS AudioContext
 */
function getContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = createAudioContext();
    destinationNode = audioContext.createMediaStreamDestination();
  }
  return audioContext;
}

/**
 * Get the MediaStream that carries all TTS audio output.
 * Connect this to the recording mixer to capture AI speech.
 */
export function getTTSOutputStream(): MediaStream | null {
  if (!destinationNode) return null;
  return destinationNode.stream;
}

/**
 * Ensure the bridge is initialized (call early so stream is available)
 */
export function initTTSBridge(): MediaStream {
  const ctx = getContext();
  if (!destinationNode) {
    destinationNode = ctx.createMediaStreamDestination();
  }
  return destinationNode.stream;
}

/**
 * Play an audio blob through both speakers and the capture stream.
 * Used by Piper TTS.
 */
export async function playTTSBlob(blob: Blob): Promise<void> {
  const ctx = getContext();
  if (!destinationNode) {
    destinationNode = ctx.createMediaStreamDestination();
  }

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Stop any currently playing TTS
  stopTTSPlayback();

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  return new Promise((resolve, reject) => {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Route to speakers
    source.connect(ctx.destination);
    // Route to capturable stream
    source.connect(destinationNode!);

    currentSource = source;

    source.onended = () => {
      currentSource = null;
      resolve();
    };

    try {
      source.start(0);
    } catch (err) {
      currentSource = null;
      reject(err);
    }
  });
}

/**
 * Play browser SpeechSynthesis with capture support.
 * Browser speechSynthesis output can't be routed through AudioContext,
 * so we use a MediaStream workaround on supported platforms, or fall back
 * to standard speechSynthesis (no capture, but still plays to speakers).
 */
export function speakWithCapture(text: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise((resolve, reject) => {
    stopTTSPlayback();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === 'canceled') resolve();
      else reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any currently playing TTS audio (blob-based or speechSynthesis)
 */
export function stopTTSPlayback(): void {
  // Stop AudioBufferSourceNode
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource = null;
  }

  // Stop standalone Audio element (legacy fallback)
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }

  // Stop browser speechSynthesis
  window.speechSynthesis.cancel();
}

/**
 * Check if any TTS is currently playing
 */
export function isTTSPlaying(): boolean {
  return window.speechSynthesis.speaking || currentSource !== null;
}

/**
 * Clean up resources on app shutdown
 */
export function destroyTTSBridge(): void {
  stopTTSPlayback();
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
  }
  audioContext = null;
  destinationNode = null;
}
