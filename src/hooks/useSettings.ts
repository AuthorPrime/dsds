/**
 * Shared settings hook - reads persisted settings from localStorage
 * Used by all tabs that need to know the current provider selections
 */

export interface AppSettings {
  llmProvider: string;
  llmModel: string;
  ttsProvider: string;
  ttsVoice: string;
  sttProvider: string;
  sttModel: string;
  activeCompanion: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  silenceThreshold: number;
  autoTranscribe: boolean;
  localModelPath: string;
  outputFolder: string;
}

const DEFAULTS: AppSettings = {
  llmProvider: 'ollama',
  llmModel: 'llama3.2',
  ttsProvider: 'gemini',
  ttsVoice: 'Kore',
  sttProvider: 'web_speech',
  sttModel: '',
  activeCompanion: 'aletheia',
  geminiApiKey: '',
  anthropicApiKey: '',
  silenceThreshold: 2000,
  autoTranscribe: false,
  localModelPath: '/home/n0t/.ollama/models',
  outputFolder: '/home/n0t/Desktop/Sovereign_Studio_Output',
};

export function getSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('dsds-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null && parsed.constructor === Object) {
        const result: Record<string, unknown> = {};
        for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
          const val = parsed[key];
          result[key] = typeof val === typeof defaultVal ? val : defaultVal;
        }
        return result as unknown as AppSettings;
      }
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULTS };
}
