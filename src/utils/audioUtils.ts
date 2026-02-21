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
