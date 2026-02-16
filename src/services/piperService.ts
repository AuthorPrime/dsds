/**
 * Piper TTS Service — Manages the bundled Piper TTS engine.
 *
 * Piper is a fast, lightweight neural TTS (~15MB binary + ~30MB voice model).
 * It runs locally with zero internet required — perfect for out-of-box voice.
 *
 * Architecture:
 *   Text → Tauri invoke → Rust command → Piper binary → WAV bytes → TTS bridge → speakers + recording
 *
 * Voice models are stored in the app data directory:
 *   {app_data}/piper/piper[.exe]           — the binary
 *   {app_data}/piper/voices/{name}.onnx    — voice model
 *   {app_data}/piper/voices/{name}.onnx.json — voice config
 */

import { invoke } from '@tauri-apps/api/core';
import { playTTSBlob } from './ttsAudioBridge';

const PIPER_SUBDIR = 'piper';
const VOICES_SUBDIR = 'piper/voices';

// Piper release URLs (GitHub releases)
const PIPER_VERSION = '2023.11.14-2';
const PIPER_BASE_URL = `https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}`;

// Available voice models (bundled or downloadable)
export const PIPER_VOICES = [
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac (Male, US)',
    quality: 'medium',
    size: '30 MB',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
    configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json',
    sampleRate: 22050,
    recommended: true,
  },
  {
    id: 'en_US-amy-medium',
    name: 'Amy (Female, US)',
    quality: 'medium',
    size: '30 MB',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx',
    configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json',
    sampleRate: 22050,
    recommended: true,
  },
  {
    id: 'en_US-lessac-high',
    name: 'Lessac HD (Male, US)',
    quality: 'high',
    size: '64 MB',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/high/en_US-lessac-high.onnx',
    configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/high/en_US-lessac-high.onnx.json',
    sampleRate: 22050,
    recommended: false,
  },
  {
    id: 'en_GB-alba-medium',
    name: 'Alba (Female, British)',
    quality: 'medium',
    size: '30 MB',
    url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alba/medium/en_GB-alba-medium.onnx',
    configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json',
    sampleRate: 22050,
    recommended: false,
  },
] as const;

export type PiperVoiceId = typeof PIPER_VOICES[number]['id'];

let cachedAppDataDir: string | null = null;

/**
 * Get the app data directory (cached after first call)
 */
async function getAppDataDir(): Promise<string> {
  if (!cachedAppDataDir) {
    cachedAppDataDir = await invoke<string>('get_app_data_dir');
  }
  return cachedAppDataDir;
}

/**
 * Get the platform-specific Piper binary name
 */
function getPiperBinaryName(): string {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) return 'piper.exe';
  return 'piper';
}

/**
 * Get the full path to the Piper binary
 */
async function getPiperPath(): Promise<string> {
  const dataDir = await getAppDataDir();
  const sep = navigator.platform.toLowerCase().includes('win') ? '\\' : '/';
  return `${dataDir}${sep}${PIPER_SUBDIR}${sep}${getPiperBinaryName()}`;
}

/**
 * Get the full path to a voice model
 */
async function getVoiceModelPath(voiceId: string): Promise<string> {
  const dataDir = await getAppDataDir();
  const sep = navigator.platform.toLowerCase().includes('win') ? '\\' : '/';
  return `${dataDir}${sep}${VOICES_SUBDIR}${sep}${voiceId}.onnx`;
}

/**
 * Check if Piper TTS is installed and ready to use
 */
export async function isPiperInstalled(): Promise<boolean> {
  try {
    const piperPath = await getPiperPath();
    return await invoke<boolean>('check_piper_installed', { piperPath });
  } catch {
    return false;
  }
}

/**
 * Check if a specific voice model is installed
 */
export async function isVoiceInstalled(voiceId: string): Promise<boolean> {
  try {
    const modelPath = await getVoiceModelPath(voiceId);
    return await invoke<boolean>('check_piper_installed', { piperPath: modelPath });
  } catch {
    return false;
  }
}

/**
 * Get installation status for Piper and all voices
 */
export async function getPiperStatus(): Promise<{
  installed: boolean;
  voices: { id: string; name: string; installed: boolean; size: string }[];
}> {
  const installed = await isPiperInstalled();
  const voices = await Promise.all(
    PIPER_VOICES.map(async (v) => ({
      id: v.id,
      name: v.name,
      installed: await isVoiceInstalled(v.id),
      size: v.size,
    }))
  );
  return { installed, voices };
}

/**
 * Get the download URL for the Piper binary for the current platform
 */
export function getPiperDownloadUrl(): string {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) {
    return `${PIPER_BASE_URL}/piper_windows_amd64.zip`;
  } else if (platform.includes('mac')) {
    return `${PIPER_BASE_URL}/piper_macos_x64.tar.gz`;
  } else {
    return `${PIPER_BASE_URL}/piper_linux_x86_64.tar.gz`;
  }
}

/**
 * Download and install the Piper binary for the current platform
 */
export async function installPiper(): Promise<void> {
  const dataDir = await getAppDataDir();
  const sep = navigator.platform.toLowerCase().includes('win') ? '\\' : '/';
  const piperDir = `${dataDir}${sep}${PIPER_SUBDIR}`;
  const downloadUrl = getPiperDownloadUrl();
  const isWin = navigator.platform.toLowerCase().includes('win');
  const archiveName = isWin ? 'piper.zip' : 'piper.tar.gz';
  const archivePath = `${piperDir}${sep}${archiveName}`;

  // Download archive
  await invoke('download_file', { url: downloadUrl, destPath: archivePath });

  // Extract — use shell plugin to run extraction
  const { Command } = await import('@tauri-apps/plugin-shell');
  if (isWin) {
    // PowerShell Expand-Archive
    await Command.create('exec-powershell', [
      '-Command',
      `Expand-Archive -Path '${archivePath}' -DestinationPath '${piperDir}' -Force`
    ]).execute();
  } else {
    await Command.create('exec-sh', ['-c', `tar -xzf '${archivePath}' -C '${piperDir}'`]).execute();
  }

  // Clean up archive
  try {
    await invoke('download_file', { url: 'cleanup', destPath: 'cleanup' }).catch(() => {});
  } catch { /* ignore */ }
}

/**
 * Download and install a specific Piper voice model
 */
export async function installVoice(voiceId: string): Promise<void> {
  const voice = PIPER_VOICES.find(v => v.id === voiceId);
  if (!voice) throw new Error(`Unknown voice: ${voiceId}`);

  const modelPath = await getVoiceModelPath(voiceId);
  const configPath = `${modelPath}.json`;

  // Download model and config in parallel
  await Promise.all([
    invoke('download_file', { url: voice.url, destPath: modelPath }),
    invoke('download_file', { url: voice.configUrl, destPath: configPath }),
  ]);
}

/**
 * Speak text using the bundled Piper TTS engine.
 * The audio is routed through the TTS bridge for speaker output + recording capture.
 *
 * Falls back to null if Piper is not installed (caller should use browser TTS).
 */
export async function speakWithPiper(text: string, voiceId: string): Promise<boolean> {
  try {
    const piperPath = await getPiperPath();
    const modelPath = await getVoiceModelPath(voiceId);

    // Check both binary and model exist
    const [hasBinary, hasModel] = await Promise.all([
      invoke<boolean>('check_piper_installed', { piperPath }),
      invoke<boolean>('check_piper_installed', { piperPath: modelPath }),
    ]);

    if (!hasBinary || !hasModel) return false;

    // Invoke Piper via Rust command — returns WAV bytes
    const wavBytes = await invoke<number[]>('speak_piper', {
      text,
      piperPath,
      modelPath,
    });

    // Convert to blob and play through bridge
    const wavBlob = new Blob([new Uint8Array(wavBytes)], { type: 'audio/wav' });
    await playTTSBlob(wavBlob);
    return true;
  } catch (err) {
    console.warn('Piper TTS failed, falling back:', err);
    return false;
  }
}
