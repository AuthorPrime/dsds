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
  geminiApiKey: string;   // kept for backward compat with saved settings
  anthropicApiKey: string; // kept for backward compat with saved settings
  // Cloud AI — OpenAI-compatible API endpoint
  llmApiEndpoint: string;
  llmApiKey: string;
  llmApiModel: string;
  silenceThreshold: number;
  autoTranscribe: boolean;
  localModelPath: string;
  outputFolder: string;
  // User branding (used in AI prompts, exports, thumbnails)
  podcastName: string;
  hostName: string;
  organizationName: string;
  websiteUrl: string;
  // Onboarding
  hasCompletedOnboarding: boolean;
  // Usage stats
  totalSessions: number;
  totalEnhancements: number;
}

// Platform detection
const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

export const DEFAULTS: AppSettings = {
  llmProvider: 'ollama',
  llmModel: 'llama3.2',
  ttsProvider: 'piper',
  ttsVoice: 'en_US-amy-medium',
  sttProvider: 'web_speech',
  sttModel: '',
  activeCompanion: 'aletheia',
  geminiApiKey: '',
  anthropicApiKey: '',
  llmApiEndpoint: '',
  llmApiKey: '',
  llmApiModel: '',
  silenceThreshold: 2000,
  autoTranscribe: false,
  localModelPath: isWindows ? 'C:\\Users\\Public\\.ollama\\models' : '~/.ollama/models',
  outputFolder: isWindows ? 'C:\\Users\\Public\\Documents\\Sovereign_Studio' : '~/Documents/Sovereign_Studio',
  podcastName: 'My Podcast',
  hostName: 'Host',
  organizationName: '',
  websiteUrl: '',
  hasCompletedOnboarding: false,
  totalSessions: 0,
  totalEnhancements: 0,
};

/** Increment a numeric counter in settings (e.g. totalSessions, totalEnhancements) */
export function incrementStat(key: 'totalSessions' | 'totalEnhancements') {
  const current = getSettings();
  const updated = { ...current, [key]: (current[key] || 0) + 1 };
  localStorage.setItem('dsds-settings', JSON.stringify(updated));
  return updated[key];
}

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
