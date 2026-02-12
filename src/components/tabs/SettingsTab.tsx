/**
 * Settings Tab - Provider Configuration Hub
 * Dynamically loads LLM/TTS/STT providers from JSON configs
 * Manages companion selection, API keys, and studio preferences
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Key, Volume2, Cpu, FolderOpen, Save, RefreshCw,
  Mic, MessageSquare, Users, Check, AlertCircle, Loader2, FolderPlus,
} from 'lucide-react';
import type { LLMProvider, TTSProvider, STTProvider, CompanionConfig } from '../../types';
import { FilePickerButton } from '../shared/FilePickerButton';
import { ensureDirectories, getOutputStructure } from '../../services/fileManager';
import {
  loadLLMProviders,
  loadTTSProviders,
  loadSTTProviders,
  loadCompanions,
  checkProviderAvailability,
} from '../../utils/aiProviders';
import { isOllamaAvailable, listModels as listOllamaModels } from '../../services/ollama';

// --- Settings shape ---
interface Settings {
  // Provider selections
  llmProvider: string;
  llmModel: string;
  ttsProvider: string;
  ttsVoice: string;
  sttProvider: string;
  sttModel: string;

  // Companion
  activeCompanion: string;

  // API Keys
  geminiApiKey: string;
  anthropicApiKey: string;

  // Studio
  silenceThreshold: number;
  autoTranscribe: boolean;

  // Paths
  localModelPath: string;
  outputFolder: string;
}

const DEFAULTS: Settings = {
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

function loadSettings(): Settings {
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
        return result as unknown as Settings;
      }
    }
  } catch {
    console.error('Failed to load settings');
  }
  return { ...DEFAULTS };
}

// --- Status badge ---
function StatusDot({ available, label }: { available: boolean | null; label: string }) {
  if (available === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 size={12} className="animate-spin" /> Checking {label}...
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1.5 text-xs ${available ? 'text-emerald-400' : 'text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${available ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {label} {available ? 'online' : 'offline'}
    </span>
  );
}

// --- Main component ---
export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [dirsCreated, setDirsCreated] = useState(false);
  const [creatingDirs, setCreatingDirs] = useState(false);

  // Loaded provider configs
  const [llmProviders, setLlmProviders] = useState<Record<string, LLMProvider>>({});
  const [ttsProviders, setTtsProviders] = useState<Record<string, TTSProvider>>({});
  const [sttProviders, setSttProviders] = useState<Record<string, STTProvider>>({});
  const [companions, setCompanions] = useState<CompanionConfig[]>([]);

  // Live Ollama models (dynamically discovered)
  const [ollamaLiveModels, setOllamaLiveModels] = useState<string[]>([]);

  // Availability checks
  const [ollamaStatus, setOllamaStatus] = useState<boolean | null>(null);
  const [whisperStatus, setWhisperStatus] = useState<boolean | null>(null);

  // Load everything on mount
  useEffect(() => {
    async function init() {
      const [llm, tts, stt, comps] = await Promise.all([
        loadLLMProviders(),
        loadTTSProviders(),
        loadSTTProviders(),
        loadCompanions(),
      ]);
      setLlmProviders(llm);
      setTtsProviders(tts);
      setSttProviders(stt);
      setCompanions(comps);

      // Check Ollama
      const ollamaOk = await isOllamaAvailable();
      setOllamaStatus(ollamaOk);
      if (ollamaOk) {
        const models = await listOllamaModels();
        setOllamaLiveModels(models);
      }

      // Check Whisper.cpp
      const whisperOk = await checkProviderAvailability('http://localhost:8080');
      setWhisperStatus(whisperOk);
    }
    init();
  }, []);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('dsds-settings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      console.error('Failed to save settings');
    }
  }, [settings]);

  // Derived data for current selections
  const currentLLM = llmProviders[settings.llmProvider];
  const currentTTS = ttsProviders[settings.ttsProvider];
  const currentSTT = sttProviders[settings.sttProvider];

  // Merge static JSON models with live Ollama models
  const llmModelOptions = (() => {
    if (settings.llmProvider === 'ollama' && ollamaLiveModels.length > 0) {
      return ollamaLiveModels;
    }
    return currentLLM?.models?.map(m => m.id) ?? [];
  })();

  const ttsVoiceOptions = currentTTS?.voices ?? [];
  const sttModelOptions = currentSTT?.models ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Settings
          </h2>
          <p className="text-sm text-slate-400 mt-1">Configure Sovereign Studio providers and preferences</p>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <StatusDot available={ollamaStatus} label="Ollama" />
          <StatusDot available={whisperStatus} label="Whisper.cpp" />
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Web Speech API available
          </span>
        </div>

        {/* ===== LLM PROVIDER ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <MessageSquare size={18} /> Language Model (LLM)
          </h3>
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Provider</label>
              <select
                value={settings.llmProvider}
                onChange={(e) => {
                  const prov = e.target.value;
                  update('llmProvider', prov);
                  // Auto-select first model
                  const p = llmProviders[prov];
                  if (prov === 'ollama' && ollamaLiveModels.length > 0) {
                    update('llmModel', ollamaLiveModels[0]);
                  } else if (p?.models?.[0]) {
                    update('llmModel', p.models[0].id);
                  }
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
              >
                {Object.entries(llmProviders).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name} ({p.type})
                    {p.requiresApiKey ? ' - API key required' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Model</label>
              {llmModelOptions.length > 0 ? (
                <select
                  value={settings.llmModel}
                  onChange={(e) => update('llmModel', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                >
                  {llmModelOptions.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  {settings.llmProvider === 'ollama' && !ollamaStatus
                    ? 'Start Ollama to see available models'
                    : settings.llmProvider === 'lmstudio'
                      ? 'Load a model in LM Studio to detect it'
                      : 'No models available'}
                </p>
              )}
            </div>

            {/* Show status for local providers */}
            {currentLLM?.type === 'local' && settings.llmProvider === 'ollama' && (
              <div className="flex items-center gap-2 text-sm">
                {ollamaStatus ? (
                  <span className="text-emerald-400 flex items-center gap-1"><Check size={14} /> Connected - {ollamaLiveModels.length} model(s) loaded</span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={14} /> Ollama not running. Start with: ollama serve</span>
                )}
              </div>
            )}

            {currentLLM?.requiresApiKey && (
              <p className="text-xs text-amber-400/80">
                Requires API key - set below in API Keys section
              </p>
            )}
          </div>
        </section>

        {/* ===== TTS PROVIDER ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Volume2 size={18} /> Text-to-Speech (TTS)
          </h3>
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Provider</label>
              <select
                value={settings.ttsProvider}
                onChange={(e) => {
                  const prov = e.target.value;
                  update('ttsProvider', prov);
                  const p = ttsProviders[prov];
                  if (p?.voices?.[0]) {
                    update('ttsVoice', p.voices[0].id);
                  }
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
              >
                {Object.entries(ttsProviders)
                  .filter(([, p]) => p.enabled !== false)
                  .map(([id, p]) => (
                    <option key={id} value={id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
              </select>
            </div>

            {ttsVoiceOptions.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {ttsVoiceOptions.map(voice => (
                    <button
                      key={voice.id}
                      onClick={() => update('ttsVoice', voice.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        settings.ttsVoice === voice.id
                          ? 'bg-purple-900/20 border-purple-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <p className="font-medium text-sm text-slate-200">{voice.name}</p>
                      {voice.description && <p className="text-xs text-slate-500">{voice.description}</p>}
                      {voice.quality && <p className="text-xs text-slate-500">Quality: {voice.quality}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===== STT PROVIDER ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Mic size={18} /> Speech-to-Text (STT)
          </h3>
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Provider</label>
              <select
                value={settings.sttProvider}
                onChange={(e) => {
                  const prov = e.target.value;
                  update('sttProvider', prov);
                  const p = sttProviders[prov];
                  const firstModel = p?.models?.[0];
                  update('sttModel', firstModel?.id ?? '');
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
              >
                {Object.entries(sttProviders).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>

            {sttModelOptions.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {sttModelOptions.map(model => (
                    <button
                      key={model.id}
                      onClick={() => update('sttModel', model.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        settings.sttModel === model.id
                          ? 'bg-cyan-900/20 border-cyan-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <p className="font-medium text-sm text-slate-200">{model.name}</p>
                      <p className="text-xs text-slate-500">{model.size} - {model.quality}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {settings.sttProvider === 'web_speech' && (
              <p className="text-xs text-slate-500">
                Uses your browser's built-in speech recognition (Chrome/Edge). No download needed.
              </p>
            )}

            {settings.sttProvider === 'whispercpp' && (
              <div className="flex items-center gap-2 text-sm">
                {whisperStatus ? (
                  <span className="text-emerald-400 flex items-center gap-1"><Check size={14} /> Whisper.cpp server connected</span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={14} /> Whisper.cpp not running on port 8080</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ===== COMPANION ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Users size={18} /> AI Companion
          </h3>
          <div className="space-y-3 pl-6">
            {companions.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {companions.map(c => (
                  <button
                    key={c.id}
                    onClick={() => update('activeCompanion', c.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      settings.activeCompanion === c.id
                        ? 'bg-purple-900/20 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <p className="font-bold text-slate-200">{c.name}</p>
                    <p className="text-xs text-purple-400">{c.role}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400">
                        LLM: {c.llm.provider}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400">
                        Voice: {c.voice.provider}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Loading companions...</p>
            )}
          </div>
        </section>

        {/* ===== API KEYS ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Key size={18} /> API Keys
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Gemini API Key</label>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(e) => update('geminiApiKey', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                placeholder="Enter your Gemini API key"
              />
              <p className="text-xs text-slate-600 mt-1">Required for Gemini LLM and Gemini Live voice</p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Anthropic API Key</label>
              <input
                type="password"
                value={settings.anthropicApiKey}
                onChange={(e) => update('anthropicApiKey', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                placeholder="Enter your Anthropic API key"
              />
              <p className="text-xs text-slate-600 mt-1">Required for Claude models</p>
            </div>
          </div>
        </section>

        {/* ===== STUDIO PREFERENCES ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Cpu size={18} /> Studio Preferences
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Silence Threshold: {settings.silenceThreshold / 1000}s
              </label>
              <input
                type="range"
                min="1000"
                max="5000"
                step="500"
                value={settings.silenceThreshold}
                onChange={(e) => update('silenceThreshold', Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <p className="text-xs text-slate-600 mt-1">How long to wait before AI companion responds</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoTranscribe}
                onChange={(e) => update('autoTranscribe', e.target.checked)}
                className="w-5 h-5 accent-purple-500"
              />
              <div>
                <p className="text-slate-300">Auto-transcribe recordings</p>
                <p className="text-xs text-slate-500">Automatically transcribe after recording stops</p>
              </div>
            </label>
          </div>
        </section>

        {/* ===== OUTPUT ===== */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <FolderOpen size={18} /> Output
          </h3>
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Ollama Models Path</label>
              <input
                type="text"
                value={settings.localModelPath}
                onChange={(e) => update('localModelPath', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Default Output Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.outputFolder}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none cursor-default"
                />
                <FilePickerButton
                  mode="folder"
                  label="Browse"
                  currentPath={settings.outputFolder}
                  onSelect={(path) => {
                    if (typeof path === 'string') {
                      update('outputFolder', path);
                      setDirsCreated(false);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">All recordings, transcripts, and exports save here</p>
            </div>

            {/* Create Folders button */}
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  setCreatingDirs(true);
                  try {
                    await ensureDirectories();
                    setDirsCreated(true);
                    setTimeout(() => setDirsCreated(false), 3000);
                  } catch (err) {
                    console.error('Failed to create directories:', err);
                  } finally {
                    setCreatingDirs(false);
                  }
                }}
                disabled={creatingDirs}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
              >
                {creatingDirs ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating...</>
                ) : dirsCreated ? (
                  <><Check size={14} className="text-emerald-400" /> Folders Ready</>
                ) : (
                  <><FolderPlus size={14} /> Create Output Folders</>
                )}
              </button>
            </div>

            {/* Folder structure info */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2 font-medium">Output folder structure:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                {getOutputStructure().map(s => (
                  <span key={s.folder}>📁 {s.folder}/ <span className="text-slate-600">— {s.description}</span></span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== SAVE ===== */}
        <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              setSettings({ ...DEFAULTS });
              setSaved(false);
            }}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg flex items-center gap-2 text-slate-300 transition-colors"
          >
            <RefreshCw size={16} />
            Reset Defaults
          </button>
          <button
            onClick={saveSettings}
            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:scale-[1.02]'
            }`}
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
