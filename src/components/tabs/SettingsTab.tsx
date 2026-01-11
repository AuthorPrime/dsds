import { useState } from 'react';
import { Key, Volume2, Cpu, FolderOpen, Save, RefreshCw } from 'lucide-react';

interface Settings {
  geminiApiKey: string;
  defaultVoice: string;
  silenceThreshold: number;
  localModelPath: string;
  whisperModel: string;
  outputFolder: string;
  autoTranscribe: boolean;
  darkMode: boolean;
}

const VOICE_OPTIONS = [
  { id: 'Kore', name: 'Kore', description: 'Warm and supportive' },
  { id: 'Puck', name: 'Puck', description: 'Playful and energetic' },
  { id: 'Charon', name: 'Charon', description: 'Deep and thoughtful' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Strong and confident' },
  { id: 'Zephyr', name: 'Zephyr', description: 'Light and airy' },
];

const WHISPER_MODELS = [
  { id: 'tiny', name: 'Tiny', description: 'Fastest, lowest accuracy' },
  { id: 'base', name: 'Base', description: 'Fast, good accuracy' },
  { id: 'small', name: 'Small', description: 'Balanced (recommended)' },
  { id: 'medium', name: 'Medium', description: 'Slower, better accuracy' },
  { id: 'large', name: 'Large', description: 'Slowest, best accuracy' },
];

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>({
    geminiApiKey: '',
    defaultVoice: 'Kore',
    silenceThreshold: 2000,
    localModelPath: '/home/n0t/.ollama/models',
    whisperModel: 'small',
    outputFolder: '/home/n0t/Desktop/Sovereign_Studio_Output',
    autoTranscribe: false,
    darkMode: true,
  });

  const [saved, setSaved] = useState(false);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    // In real implementation, save to Tauri store or config file
    console.log('Saving settings:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">Settings</h2>
          <p className="text-gray-500 mt-1">Configure Sovereign Studio</p>
        </div>

        {/* API Keys */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <Key size={18} /> API Keys
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Gemini API Key</label>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(e) => updateSetting('geminiApiKey', e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                placeholder="Enter your Gemini API key"
              />
              <p className="text-xs text-gray-600 mt-1">Required for AI voice features</p>
            </div>
          </div>
        </section>

        {/* Voice Settings */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <Volume2 size={18} /> Voice Settings
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Default AI Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_OPTIONS.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => updateSetting('defaultVoice', voice.id)}
                    className={`
                      p-3 rounded-lg border text-left transition-all
                      ${settings.defaultVoice === voice.id
                        ? 'bg-purple-900/20 border-purple-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <p className="font-medium">{voice.name}</p>
                    <p className="text-xs text-gray-500">{voice.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Silence Threshold: {settings.silenceThreshold / 1000}s
              </label>
              <input
                type="range"
                min="1000"
                max="5000"
                step="500"
                value={settings.silenceThreshold}
                onChange={(e) => updateSetting('silenceThreshold', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <p className="text-xs text-gray-600 mt-1">How long to wait before AI responds</p>
            </div>
          </div>
        </section>

        {/* Local AI */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <Cpu size={18} /> Local AI
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Whisper Model</label>
              <div className="grid grid-cols-3 gap-2">
                {WHISPER_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => updateSetting('whisperModel', model.id)}
                    className={`
                      p-3 rounded-lg border text-left transition-all
                      ${settings.whisperModel === model.id
                        ? 'bg-cyan-900/20 border-cyan-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <p className="font-medium">{model.name}</p>
                    <p className="text-xs text-gray-500">{model.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Ollama Models Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.localModelPath}
                  onChange={(e) => updateSetting('localModelPath', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                />
                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                  <FolderOpen size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Output */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <FolderOpen size={18} /> Output
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Default Output Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.outputFolder}
                  onChange={(e) => updateSetting('outputFolder', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                />
                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                  <FolderOpen size={18} />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoTranscribe}
                onChange={(e) => updateSetting('autoTranscribe', e.target.checked)}
                className="w-5 h-5 accent-cyan-500"
              />
              <div>
                <p className="text-gray-300">Auto-transcribe recordings</p>
                <p className="text-xs text-gray-500">Automatically transcribe after recording stops</p>
              </div>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-800">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reset
          </button>
          <button
            onClick={saveSettings}
            className={`
              px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all
              ${saved
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:scale-[1.02]'
              }
            `}
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
