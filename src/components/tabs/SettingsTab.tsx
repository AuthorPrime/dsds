/**
 * Settings Tab - Simplified for Sovereign Studio
 * Built-in AI, built-in voices, built-in speech recognition
 * Advanced options available for power users
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Volume2, Cpu, FolderOpen, Save, RefreshCw, Sparkles,
  Mic, MessageSquare, Users, Check, AlertCircle, Loader2, FolderPlus, Tag,
  ChevronDown, ChevronUp, Download,
} from 'lucide-react';
import type { CompanionConfig } from '../../types';
import { FilePickerButton } from '../shared/FilePickerButton';
import { ensureDirectories, getOutputStructure } from '../../services/fileManager';
import { loadCompanions } from '../../utils/aiProviders';
import { isOllamaAvailable, listModels as listOllamaModels, getActiveBackend } from '../../services/ollama';
import { getPiperStatus, PIPER_VOICES } from '../../services/piperService';

// --- Settings shape ---
interface Settings {
  // Provider selections (simplified — one built-in per category)
  llmProvider: string;
  llmModel: string;
  ttsProvider: string;
  ttsVoice: string;
  sttProvider: string;
  sttModel: string;

  // Companion
  activeCompanion: string;

  // API Keys (kept for backward compat, hidden from UI)
  geminiApiKey: string;
  anthropicApiKey: string;

  // Studio
  silenceThreshold: number;
  autoTranscribe: boolean;

  // Paths
  localModelPath: string;
  outputFolder: string;

  // User branding
  podcastName: string;
  hostName: string;
  organizationName: string;
  websiteUrl: string;
}

const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

const DEFAULTS: Settings = {
  llmProvider: 'ollama',
  llmModel: 'llama3.2',
  ttsProvider: 'piper',
  ttsVoice: 'en_US-amy-medium',
  sttProvider: 'web_speech',
  sttModel: '',
  activeCompanion: 'aletheia',
  geminiApiKey: '',
  anthropicApiKey: '',
  silenceThreshold: 2000,
  autoTranscribe: false,
  localModelPath: isWindows ? 'C:\\Users\\Public\\.ollama\\models' : '~/.ollama/models',
  outputFolder: isWindows ? 'C:\\Users\\Public\\Documents\\Sovereign_Studio' : '~/Documents/Sovereign_Studio',
  podcastName: 'My Podcast',
  hostName: 'Host',
  organizationName: '',
  websiteUrl: '',
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

// --- Main component ---
export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [dirsCreated, setDirsCreated] = useState(false);
  const [creatingDirs, setCreatingDirs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Companions
  const [companions, setCompanions] = useState<CompanionConfig[]>([]);

  // Live Ollama models (dynamically discovered)
  const [ollamaLiveModels, setOllamaLiveModels] = useState<string[]>([]);

  // AI status
  const [ollamaStatus, setOllamaStatus] = useState<boolean | null>(null);
  const [activeBackend, setActiveBackend] = useState<string | null>(null);

  // Piper TTS status
  const [piperInstalled, setPiperInstalled] = useState(false);
  const [piperVoiceStatus, setPiperVoiceStatus] = useState<{ id: string; name: string; installed: boolean; size: string }[]>([]);
  const [downloadingVoice, setDownloadingVoice] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  // Load companions, check AI backend, check Piper status
  useEffect(() => {
    async function init() {
      const comps = await loadCompanions();
      setCompanions(comps);

      const ollamaOk = await isOllamaAvailable();
      setOllamaStatus(ollamaOk);
      setActiveBackend(getActiveBackend());
      if (ollamaOk) {
        const models = await listOllamaModels();
        setOllamaLiveModels(models);
      }

      // Check Piper TTS status
      try {
        const status = await getPiperStatus();
        setPiperInstalled(status.installed);
        setPiperVoiceStatus(status.voices);
      } catch {
        // Piper check failed — not installed
      }
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

  // Model options (live discovery or static fallback)
  const llmModelOptions = ollamaLiveModels.length > 0
    ? ollamaLiveModels
    : ['llama3.2'];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-phi-6 space-y-phi-6">
        {/* Header */}
        <div>
          <h2 className="text-phi-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Settings
          </h2>
          <p className="text-phi-md text-slate-400 mt-phi-3">Configure your Sovereign Studio</p>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap gap-phi-4 p-phi-4 bg-white/[0.05] rounded-phi-lg border border-white/10 shadow-phi-sm">
          <span className={`flex items-center gap-phi-2 text-phi-sm ${ollamaStatus === null ? 'text-slate-500' : ollamaStatus ? 'text-emerald-400' : 'text-red-400'}`}>
            {ollamaStatus === null ? (
              <><Loader2 size={14} className="animate-spin" /> Checking AI...</>
            ) : (
              <>
                <span className={`w-phi-2 h-phi-2 rounded-full ${ollamaStatus ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {activeBackend === 'llamacpp' ? 'Built-in AI' : 'AI Model'} {ollamaStatus ? 'ready' : 'offline'}
              </>
            )}
          </span>
          <span className={`flex items-center gap-phi-2 text-phi-sm ${piperInstalled ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-phi-2 h-phi-2 rounded-full ${piperInstalled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {piperInstalled ? 'Voice ready' : 'Voice needs setup'}
          </span>
          <span className="flex items-center gap-phi-2 text-phi-sm text-emerald-400">
            <span className="w-phi-2 h-phi-2 rounded-full bg-emerald-400" />
            Speech recognition ready
          </span>
        </div>

        {/* ===== AI MODEL ===== */}
        <section className="space-y-phi-4">
          <h3 className="text-phi-lg font-bold text-slate-300 flex items-center gap-phi-3">
            <MessageSquare size={20} /> AI Model
          </h3>
          <div className="space-y-3 pl-6">
            <div className="flex items-center gap-2 text-sm">
              {ollamaStatus && activeBackend === 'llamacpp' ? (
                <span className="text-emerald-400 flex items-center gap-1"><Check size={14} /> Built-in AI model active</span>
              ) : ollamaStatus ? (
                <span className="text-emerald-400 flex items-center gap-1"><Check size={14} /> AI connected — {ollamaLiveModels.length} model(s) available</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={14} /> AI not running. Start from the onboarding setup.</span>
              )}
            </div>

            {llmModelOptions.length > 1 && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Active Model</label>
                <select
                  value={settings.llmModel}
                  onChange={(e) => update('llmModel', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                >
                  {llmModelOptions.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* ===== VOICE ===== */}
        <section className="space-y-phi-4">
          <h3 className="text-phi-lg font-bold text-slate-300 flex items-center gap-phi-3">
            <Volume2 size={20} /> Voice
          </h3>
          <div className="space-y-phi-4 pl-phi-5">
            {!piperInstalled ? (
              <div className="p-phi-4 bg-amber-900/10 border border-amber-500/20 rounded-phi-lg">
                <p className="text-phi-sm text-amber-300 mb-phi-2">Voice engine needs setup</p>
                <p className="text-phi-xs text-slate-400 mb-phi-3">
                  Download the built-in voice engine (~15MB) for natural-sounding speech. Runs locally, no internet needed after install.
                </p>
                <button
                  onClick={async () => {
                    setDownloadingVoice('piper-binary');
                    setDownloadProgress('Downloading voice engine...');
                    try {
                      const { installPiper } = await import('../../services/piperService');
                      await installPiper();
                      setPiperInstalled(true);
                      setDownloadProgress('Voice engine installed!');
                      const status = await getPiperStatus();
                      setPiperVoiceStatus(status.voices);
                    } catch (err) {
                      setDownloadProgress(`Install failed: ${err}`);
                    } finally {
                      setTimeout(() => {
                        setDownloadingVoice(null);
                        setDownloadProgress('');
                      }, 3000);
                    }
                  }}
                  disabled={downloadingVoice !== null}
                  className="px-phi-4 py-phi-3 bg-purple-600 hover:bg-purple-500 text-white rounded-phi-lg text-phi-sm font-medium flex items-center gap-phi-2 transition-all duration-300 disabled:opacity-50 hover:shadow-glow-purple"
                >
                  {downloadingVoice === 'piper-binary' ? (
                    <><Loader2 size={16} className="animate-spin" /> {downloadProgress}</>
                  ) : (
                    <><Download size={16} /> Install Voice Engine</>
                  )}
                </button>
              </div>
            ) : (
              <>
                <p className="text-phi-sm text-emerald-400 flex items-center gap-phi-2">
                  <Check size={16} /> Voice engine ready
                </p>

                {/* Voice cards */}
                <div className="space-y-phi-3">
                  <label className="block text-phi-sm text-slate-400">Available Voices</label>
                  {PIPER_VOICES.map(v => {
                    const status = piperVoiceStatus.find(s => s.id === v.id);
                    const isDownloading = downloadingVoice === v.id;
                    const isActive = settings.ttsVoice === v.id;
                    return (
                      <div key={v.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isActive && status?.installed
                          ? 'bg-purple-900/20 border-purple-500/40 shadow-md shadow-purple-500/10'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isActive && status?.installed ? 'bg-purple-500/20' : 'bg-white/[0.04]'
                          }`}>
                            {isActive && status?.installed ? (
                              <Check size={16} className="text-purple-400" />
                            ) : (
                              <Volume2 size={16} className="text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {v.name}
                              {v.recommended && <span className="ml-2 text-xs text-purple-400">Recommended</span>}
                            </p>
                            <p className="text-xs text-slate-500">{v.quality} quality — {v.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {status?.installed ? (
                            isActive ? (
                              <span className="px-3 py-1.5 rounded-lg text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20">Active</span>
                            ) : (
                              <button
                                onClick={() => update('ttsVoice', v.id)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-white/10 text-slate-300 border border-white/10 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-purple-300 transition-colors"
                              >
                                Select
                              </button>
                            )
                          ) : (
                            <button
                              onClick={async () => {
                                setDownloadingVoice(v.id);
                                setDownloadProgress(`Downloading ${v.name}...`);
                                try {
                                  const { installVoice } = await import('../../services/piperService');
                                  await installVoice(v.id);
                                  const newStatus = await getPiperStatus();
                                  setPiperVoiceStatus(newStatus.voices);
                                  update('ttsVoice', v.id);
                                } catch (err) {
                                  console.error('Voice download failed:', err);
                                  setDownloadProgress(`Failed: ${err}`);
                                } finally {
                                  setDownloadingVoice(null);
                                  setDownloadProgress('');
                                }
                              }}
                              disabled={downloadingVoice !== null}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              {isDownloading ? (
                                <><Loader2 size={12} className="animate-spin" /> Downloading...</>
                              ) : (
                                <><Download size={12} /> Download</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ===== SPEECH RECOGNITION ===== */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2">
            <Mic size={18} /> Speech Recognition
          </h3>
          <div className="pl-6">
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <Check size={14} /> Built-in speech recognition active
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Uses your system's built-in speech recognition. No download needed.
            </p>
          </div>
        </section>

        {/* ===== COMPANION ===== */}
        <section className="space-y-phi-4">
          <h3 className="text-phi-lg font-bold text-slate-300 flex items-center gap-phi-3">
            <Users size={20} /> AI Companion
          </h3>
          <div className="space-y-phi-3 pl-phi-5">
            {companions.length > 0 ? (
              <div className="grid grid-cols-2 gap-phi-3">
                {companions.map(c => (
                  <button
                    key={c.id}
                    onClick={() => update('activeCompanion', c.id)}
                    className={`p-phi-4 rounded-phi-lg border text-left transition-all duration-300 ${
                      settings.activeCompanion === c.id
                        ? 'bg-purple-900/25 border-purple-500/60 shadow-glow-purple'
                        : 'bg-white/[0.05] border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className="font-bold text-slate-200 text-phi-sm">{c.name}</p>
                    <p className="text-phi-xs text-purple-400">{c.role}</p>
                    <p className="text-phi-xs text-slate-500 mt-phi-2 line-clamp-2">{c.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-phi-sm text-slate-500 italic">Loading companions...</p>
            )}
          </div>
        </section>

        {/* ===== YOUR BRAND ===== */}
        <section className="space-y-phi-4">
          <h3 className="text-phi-lg font-bold text-slate-300 flex items-center gap-phi-3">
            <Tag size={20} /> Your Brand
          </h3>
          <p className="text-phi-xs text-slate-500 pl-phi-5">
            Used in AI-generated content, exports, and thumbnails. Leave blank for generic defaults.
          </p>
          <div className="space-y-phi-4 pl-phi-5">
            <div>
              <label className="block text-phi-sm text-slate-400 mb-phi-2">Podcast / Show Name</label>
              <input
                type="text"
                value={settings.podcastName}
                onChange={(e) => update('podcastName', e.target.value)}
                className="w-full px-phi-4 py-phi-3 bg-white/[0.05] border border-white/10 rounded-phi-lg text-slate-200 focus:border-purple-500/50 focus:outline-none transition-colors"
                placeholder="My Podcast"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Host Name</label>
              <input
                type="text"
                value={settings.hostName}
                onChange={(e) => update('hostName', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Organization</label>
              <input
                type="text"
                value={settings.organizationName}
                onChange={(e) => update('organizationName', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                placeholder="Your organization (optional)"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Website URL</label>
              <input
                type="text"
                value={settings.websiteUrl}
                onChange={(e) => update('websiteUrl', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                placeholder="https://yoursite.com (optional)"
              />
            </div>
          </div>
        </section>

        {/* ===== STUDIO PREFERENCES ===== */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2">
            <Cpu size={18} /> Studio Preferences
          </h3>
          <div className="space-y-5 pl-6">
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
          <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2">
            <FolderOpen size={18} /> Output
          </h3>
          <div className="space-y-5 pl-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Default Output Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.outputFolder}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none cursor-default"
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

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2 font-medium">Output folder structure:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                {getOutputStructure().map(s => (
                  <span key={s.folder}>{s.folder}/ <span className="text-slate-600">— {s.description}</span></span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== ADVANCED ===== */}
        <section className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Advanced Settings
          </button>
          {showAdvanced && (
            <div className="space-y-5 pl-6 border-l border-white/10">
              <div>
                <label className="block text-sm text-slate-400 mb-2">AI Models Path</label>
                <input
                  type="text"
                  value={settings.localModelPath}
                  onChange={(e) => update('localModelPath', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:border-purple-500/50 focus:outline-none"
                />
                <p className="text-xs text-slate-600 mt-1">Path to Ollama models directory</p>
              </div>
              <p className="text-xs text-slate-500">
                Power users: Install additional models with Ollama CLI. They'll appear in the model selector automatically.
              </p>
            </div>
          )}
        </section>

        {/* ===== YOUR JOURNEY ===== */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2">
            <Sparkles size={18} /> Your Journey
          </h3>
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div className="p-4 bg-gradient-to-br from-purple-900/15 to-transparent border border-purple-500/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-purple-300">{(() => {
                try {
                  const s = localStorage.getItem('dsds-settings');
                  return s ? (JSON.parse(s).totalSessions || 0) : 0;
                } catch { return 0; }
              })()}</p>
              <p className="text-xs text-slate-500 mt-1">Sessions recorded</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-cyan-900/15 to-transparent border border-cyan-500/10 rounded-xl text-center">
              <p className="text-2xl font-bold text-cyan-300">{(() => {
                try {
                  const s = localStorage.getItem('dsds-settings');
                  return s ? (JSON.parse(s).totalEnhancements || 0) : 0;
                } catch { return 0; }
              })()}</p>
              <p className="text-xs text-slate-500 mt-1">AI enhancements</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 pl-6 italic">
            Every session builds momentum. Keep creating.
          </p>
        </section>

        {/* ===== SAVE ===== */}
        <div className="flex justify-end gap-phi-4 pt-phi-5 border-t border-white/10">
          <button
            onClick={() => {
              setSettings({ ...DEFAULTS });
              setSaved(false);
            }}
            className="px-phi-4 py-phi-3 bg-white/[0.05] border border-white/10 hover:bg-white/10 rounded-phi-lg flex items-center gap-phi-2 text-slate-300 transition-all duration-300 hover:shadow-phi-md"
          >
            <RefreshCw size={18} />
            Reset Defaults
          </button>
          <button
            onClick={saveSettings}
            className={`px-phi-5 py-phi-3 rounded-phi-lg font-bold flex items-center gap-phi-2 transition-all duration-300 ${
              saved
                ? 'bg-emerald-600 text-white shadow-glow-cyan'
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:scale-[1.02] hover:shadow-glow-purple'
            }`}
          >
            <Save size={18} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
