import type { Blob } from '@google/genai';

// Safari AudioContext compatibility
export function createAudioContext(): AudioContext {
  type WindowWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioCtx = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
  
  if (!AudioCtx) {
    throw new Error('AudioContext is not supported in this browser.');
  }
  
  return new AudioCtx();
}

// Enumerate audio devices and validate availability
export async function enumerateAudioDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    if (audioInputs.length === 0) {
      throw new Error('No audio input devices found. Please connect a microphone.');
    }
    console.log(`Found ${audioInputs.length} audio input device(s)`);
    return audioInputs;
  } catch (error) {
    if (error instanceof Error) {
      // Preserve specific error types for better debugging
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No audio input devices found. Please connect a microphone.');
      } else if (error.message.includes('audio input devices')) {
        // Re-throw our custom error message
        throw error;
      }
      console.error('Device enumeration error:', error);
      throw new Error(`Failed to enumerate audio devices: ${error.message}`);
    }
    console.error('Unknown device enumeration error:', error);
    throw new Error('Failed to enumerate audio devices. Please check your permissions.');
  }
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function resampleTo16k(audioData: Float32Array, originalSampleRate: number): Float32Array {
  if (originalSampleRate === 16000) return audioData;
  
  const targetSampleRate = 16000;
  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const index1 = Math.floor(originalIndex);
    const index2 = Math.min(index1 + 1, audioData.length - 1);
    const fraction = originalIndex - index1;
    // Linear interpolation
    result[i] = audioData[index1] * (1 - fraction) + audioData[index2] * fraction;
  }
  return result;
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}