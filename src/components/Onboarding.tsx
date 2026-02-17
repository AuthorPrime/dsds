/**
 * Welcome / Onboarding Flow
 *
 * A multi-step guided experience for first-time users.
 * Steps: Welcome → Brand Setup → AI Check → Ready
 *
 * Saves branding fields to localStorage and sets hasCompletedOnboarding = true
 * so the flow only shows once.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Mic,
  BookOpen, Cpu, Radio, PenTool, Download,
  Loader2, User, Volume2,
} from 'lucide-react';
import { APP_BRAND } from '../branding';
import { getSettings, DEFAULTS } from '../hooks/useSettings';
import type { AppSettings } from '../hooks/useSettings';
import { isOllamaAvailable, listModels } from '../services/ollama';
import { speak, stopSpeaking } from '../services/tts';
import { PIPER_VOICES, installPiper, installVoice, isPiperInstalled, isVoiceInstalled } from '../services/piperService';

// ─── Types ──────────────────────────────────────────────────────────
type Step = 'welcome' | 'brand' | 'voice' | 'ai' | 'ready';
const STEPS: Step[] = ['welcome', 'brand', 'voice', 'ai', 'ready'];

interface OnboardingProps {
  onComplete: () => void;
}

// ─── Animated dot grid background ───────────────────────────────────
function DotGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden>
      <defs>
        <pattern id="dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />
    </svg>
  );
}

// ─── Step indicator ─────────────────────────────────────────────────
function StepIndicator({ current, steps }: { current: Step; steps: Step[] }) {
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-phi-3 justify-center">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-phi-3">
          <div className={`
            w-phi-5 h-phi-5 rounded-full flex items-center justify-center text-phi-sm font-bold transition-all duration-500
            ${i < idx
              ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-phi-md shadow-purple-500/30'
              : i === idx
                ? 'border-2 border-purple-400 text-purple-300 bg-purple-500/15 shadow-glow-purple'
                : 'border-2 border-gray-700/60 text-gray-600'
            }
          `}>
            {i < idx ? <Check size={16} /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-phi-5 h-[2px] rounded transition-all duration-500 ${i < idx ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-gray-800'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Feature card ───────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, accent }: {
  icon: typeof Mic; title: string; desc: string; accent: string;
}) {
  // Map accent color names to full Tailwind classes
  const accentStyles = {
    'purple-400': {
      iconBg: 'bg-purple-400/15',
      iconText: 'text-purple-400',
      border: 'hover:border-purple-400/40',
    },
    'cyan-400': {
      iconBg: 'bg-cyan-400/15',
      iconText: 'text-cyan-400',
      border: 'hover:border-cyan-400/40',
    },
    'amber-400': {
      iconBg: 'bg-amber-400/15',
      iconText: 'text-amber-400',
      border: 'hover:border-amber-400/40',
    },
    'emerald-400': {
      iconBg: 'bg-emerald-400/15',
      iconText: 'text-emerald-400',
      border: 'hover:border-emerald-400/40',
    },
  };
  
  const style = accentStyles[accent as keyof typeof accentStyles] || accentStyles['purple-400'];
  
  return (
    <div className={`flex items-start gap-phi-3 p-phi-4 rounded-phi-xl bg-white/[0.03] border border-white/[0.08] ${style.border} transition-all duration-300 hover:bg-white/[0.05] hover:shadow-phi-md`}>
      <div className={`p-phi-3 rounded-phi-lg ${style.iconBg} ${style.iconText} flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-phi-sm font-semibold text-slate-200">{title}</h4>
        <p className="text-phi-xs text-slate-500 mt-phi-2 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Main Onboarding Component
// ═════════════════════════════════════════════════════════════════════

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [fadeClass, setFadeClass] = useState('animate-in');

  // Brand fields
  const [podcastName, setPodcastName] = useState('');
  const [hostName, setHostName] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  // Voice selection
  const [selectedVoice, setSelectedVoice] = useState('en_US-amy-medium');
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [piperReady, setPiperReady] = useState(false);
  const [installedVoices, setInstalledVoices] = useState<Set<string>>(new Set());
  const [installingItem, setInstallingItem] = useState<string | null>(null);

  // AI check
  const [checking, setChecking] = useState(false);
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  const stepIndex = STEPS.indexOf(step);

  // Animated transition between steps
  const goToStep = useCallback((nextStep: Step) => {
    setFadeClass('opacity-0 translate-y-2');
    setTimeout(() => {
      setStep(nextStep);
      setFadeClass('animate-in');
    }, 200);
  }, []);

  const next = () => {
    if (stepIndex < STEPS.length - 1) goToStep(STEPS[stepIndex + 1]);
  };

  const prev = () => {
    if (stepIndex > 0) goToStep(STEPS[stepIndex - 1]);
  };

  // Check Piper status when we reach the voice step
  useEffect(() => {
    if (step === 'voice') {
      (async () => {
        const engineOk = await isPiperInstalled();
        setPiperReady(engineOk);
        if (engineOk) {
          const installed = new Set<string>();
          for (const v of PIPER_VOICES) {
            if (await isVoiceInstalled(v.id)) installed.add(v.id);
          }
          setInstalledVoices(installed);
        }
      })();
    }
  }, [step]);

  const [installError, setInstallError] = useState<string | null>(null);

  const handleInstallVoice = async (voiceId: string) => {
    setInstallingItem(voiceId);
    setInstallError(null);
    try {
      if (!piperReady) {
        await installPiper();
        setPiperReady(true);
      }
      await installVoice(voiceId);
      setInstalledVoices(prev => new Set([...prev, voiceId]));
      setSelectedVoice(voiceId);
    } catch (err) {
      console.error('Voice install failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found') || msg.includes('invoke')) {
        setInstallError('Download requires the desktop app. You can skip for now.');
      } else {
        setInstallError('Download failed — check your connection and try again.');
      }
    } finally {
      setInstallingItem(null);
    }
  };

  const previewVoice = (voiceId: string) => {
    stopSpeaking();
    setPreviewPlaying(voiceId);
    const sampleText = podcastName.trim()
      ? `Welcome to ${podcastName}. I'm your AI co-host, and I'm excited to create with you today.`
      : `Welcome to your new podcast. I'm your AI co-host, and I'm excited to create with you today.`;
    speak(sampleText, voiceId).then(() => setPreviewPlaying(null)).catch(() => setPreviewPlaying(null));
  };

  // Check Ollama when we reach the AI step
  useEffect(() => {
    if (step === 'ai') {
      setChecking(true);
      (async () => {
        const ok = await isOllamaAvailable();
        setOllamaOk(ok);
        if (ok) {
          const models = await listModels();
          setOllamaModels(models);
        }
        setChecking(false);
      })();
    }
  }, [step]);

  // Save settings and complete
  const handleFinish = () => {
    const current = getSettings();
    const updated: AppSettings = {
      ...current,
      podcastName: podcastName.trim() || DEFAULTS.podcastName,
      hostName: hostName.trim() || DEFAULTS.hostName,
      organizationName: organizationName.trim(),
      ttsVoice: selectedVoice || current.ttsVoice,
      hasCompletedOnboarding: true,
    };
    localStorage.setItem('dsds-settings', JSON.stringify(updated));
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 flex items-center justify-center z-50 overflow-hidden">
      <DotGrid />

      {/* Ambient gradient blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full mx-phi-6">
        {/* Step indicator */}
        <div className="mb-phi-6">
          <StepIndicator current={step} steps={STEPS} />
        </div>

        {/* Step content */}
        <div className={`transition-all duration-300 ${fadeClass}`}>
          {/* ─── STEP 1: WELCOME ─── */}
          {step === 'welcome' && (
            <div className="text-center space-y-phi-5">
              <div className="relative inline-block">
                <Sparkles size={55} className="text-purple-400 breathe mx-auto" />
              </div>

              <div>
                <h1 className="text-phi-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 leading-tight">
                  Welcome to Sovereign Studio
                </h1>
                <p className="text-slate-500 text-phi-md mt-phi-3">
                  Your AI-powered creative studio. Record, write, and publish — all from your machine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-phi-4 text-left">
                <FeatureCard
                  icon={Radio}
                  title="AI Co-Host"
                  desc="Record podcasts with an AI companion that responds naturally in conversation"
                  accent="purple-400"
                />
                <FeatureCard
                  icon={PenTool}
                  title="Smart Writer"
                  desc="Transform transcripts into articles, show notes, and social posts with AI"
                  accent="cyan-400"
                />
                <FeatureCard
                  icon={Download}
                  title="Full Pipeline"
                  desc="Automated production: titles, descriptions, thumbnails, and social media"
                  accent="amber-400"
                />
                <FeatureCard
                  icon={Cpu}
                  title="100% Local"
                  desc="Everything runs on your machine. Your data never leaves your computer"
                  accent="emerald-400"
                />
              </div>

              <button onClick={next}
                className="inline-flex items-center gap-phi-3 px-phi-6 py-phi-4 bg-gradient-to-r from-purple-600 via-violet-500 to-cyan-600 rounded-phi-xl font-semibold text-phi-md text-white shadow-phi-lg shadow-purple-500/30 hover:scale-[1.02] hover:shadow-glow-purple transition-all duration-300">
                Get Started <ArrowRight size={20} />
              </button>

              <p className="text-[11px] text-slate-600">v{APP_BRAND.version}</p>
            </div>
          )}

          {/* ─── STEP 2: BRAND SETUP ─── */}
          {step === 'brand' && (
            <div className="space-y-phi-5">
              <div className="text-center">
                <div className="w-phi-6 h-phi-6 rounded-phi-xl bg-gradient-to-br from-purple-500/25 to-cyan-500/25 border border-purple-500/25 flex items-center justify-center mx-auto mb-phi-4 shadow-glow-purple">
                  <User size={28} className="text-purple-400" />
                </div>
                <h2 className="text-phi-lg font-bold text-white">Set Up Your Brand</h2>
                <p className="text-slate-500 text-phi-sm mt-phi-2">
                  This personalizes your AI-generated content, exports, and thumbnails.
                </p>
              </div>

              <div className="space-y-phi-4">
                <div>
                  <label className="block text-phi-sm text-slate-300 mb-phi-2 font-medium">
                    Show / Podcast Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={podcastName}
                    onChange={(e) => setPodcastName(e.target.value)}
                    placeholder="e.g. The Creative Hour, Tech Talk Daily..."
                    className="w-full px-phi-4 py-phi-3 bg-white/[0.05] border border-white/[0.10] rounded-phi-lg text-phi-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                    autoFocus
                  />
                  <p className="text-phi-xs text-slate-600 mt-phi-2">Used in episode titles, descriptions, and social posts</p>
                </div>

                <div>
                  <label className="block text-phi-sm text-slate-300 mb-phi-2 font-medium">
                    Your Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Sarah Chen, Marcus Johnson..."
                    className="w-full px-phi-4 py-phi-3 bg-white/[0.05] border border-white/[0.10] rounded-phi-lg text-phi-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                  />
                  <p className="text-phi-xs text-slate-600 mt-phi-2">Appears as host name in AI prompts and exported documents</p>
                </div>

                <div>
                  <label className="block text-phi-sm text-slate-300 mb-phi-2 font-medium">
                    Organization <span className="text-slate-600 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. CreativeWorks Inc, The Knowledge Hub..."
                    className="w-full px-phi-4 py-phi-3 bg-white/[0.05] border border-white/[0.10] rounded-phi-lg text-phi-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                  />
                  <p className="text-phi-xs text-slate-600 mt-phi-2">Included in document headers and thumbnails</p>
                </div>
              </div>

              <p className="text-phi-xs text-slate-600 text-center">
                You can change these anytime in Settings → Your Brand
              </p>

              <div className="flex justify-between pt-phi-3">
                <button onClick={prev} className="flex items-center gap-phi-2 px-phi-4 py-phi-3 border border-white/[0.10] rounded-phi-lg text-phi-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all duration-300">
                  <ArrowLeft size={18} /> Back
                </button>
                <button onClick={next}
                  className="flex items-center gap-phi-2 px-phi-5 py-phi-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-phi-lg font-semibold text-phi-sm text-white shadow-phi-md shadow-purple-500/20 hover:scale-[1.02] hover:shadow-glow-purple transition-all duration-300">
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: VOICE ─── */}
          {step === 'voice' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-phi-6 h-phi-6 rounded-phi-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Volume2 size={24} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Choose Your AI Voice</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Pick a voice for your AI co-host. Download one to get started.
                </p>
              </div>

              <div className="space-y-2">
                {PIPER_VOICES.filter(v => v.recommended).map((voice) => {
                  const isInstalled = installedVoices.has(voice.id);
                  const isInstalling = installingItem === voice.id;
                  const isSelected = selectedVoice === voice.id;
                  return (
                    <div
                      key={voice.id}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                        isSelected && isInstalled
                          ? 'bg-purple-900/30 border border-purple-500/40 shadow-md shadow-purple-500/10'
                          : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected && isInstalled ? 'bg-purple-500/20' : 'bg-white/[0.04]'
                      }`}>
                        {previewPlaying === voice.id ? (
                          <Loader2 size={16} className="text-purple-400 animate-spin" />
                        ) : isInstalled && isSelected ? (
                          <Check size={16} className="text-purple-400" />
                        ) : (
                          <Volume2 size={16} className="text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{voice.name}</p>
                        <p className="text-[11px] text-slate-500">{voice.quality} quality — {voice.size}</p>
                      </div>
                      {isInstalled ? (
                        <button
                          onClick={() => {
                            setSelectedVoice(voice.id);
                            previewVoice(voice.id);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                        >
                          {previewPlaying === voice.id ? 'Playing...' : 'Preview'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstallVoice(voice.id)}
                          disabled={installingItem !== null}
                          className="px-3 py-1.5 rounded-lg text-xs bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isInstalling ? (
                            <><Loader2 size={12} className="animate-spin" /> Installing...</>
                          ) : (
                            <><Download size={12} /> Download</>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {installError && (
                <p className="text-xs text-red-400/80 text-center">
                  {installError}
                </p>
              )}

              {installedVoices.size === 0 && !installingItem && !installError && (
                <p className="text-xs text-amber-400/80 text-center">
                  Download a voice for the best experience, or skip to set up later.
                </p>
              )}

              <p className="text-xs text-slate-600 text-center">
                More voices available in Settings after setup.
              </p>

              <div className="flex justify-between pt-2">
                <button onClick={() => { stopSpeaking(); prev(); }} className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.08] rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-2">
                  {installedVoices.size === 0 && (
                    <button onClick={() => { stopSpeaking(); next(); }}
                      className="flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
                      Skip for now
                    </button>
                  )}
                  <button onClick={() => { stopSpeaking(); next(); }}
                    disabled={installedVoices.size === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/15 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: AI CHECK ─── */}
          {step === 'ai' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-phi-6 h-phi-6 rounded-phi-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Cpu size={24} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Connect Your AI</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Choose how your AI assistant connects. You can change this anytime.
                </p>
              </div>

              {/* Built-in AI */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    ollamaOk ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-white/[0.04] border border-white/[0.08]'
                  }`}>
                    {checking ? (
                      <Loader2 size={18} className="text-slate-400 animate-spin" />
                    ) : ollamaOk ? (
                      <Check size={18} className="text-emerald-400" />
                    ) : (
                      <Cpu size={18} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${ollamaOk ? 'text-emerald-300' : 'text-slate-300'}`}>
                      Built-in AI {ollamaOk ? `— ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''} ready` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ollamaOk ? 'Running on your machine. 100% private.' : 'Runs entirely on your computer. No internet needed.'}
                    </p>
                  </div>
                  {ollamaOk && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>}
                </div>
                {!ollamaOk && !checking && (
                  <div className="pl-[52px] space-y-2">
                    <p className="text-xs text-slate-500">
                      The AI co-host will be set up automatically, or download from <span className="text-cyan-400 font-medium">ollama.com</span>.
                    </p>
                    <button onClick={async () => {
                      setChecking(true);
                      const ok = await isOllamaAvailable();
                      setOllamaOk(ok);
                      if (ok) setOllamaModels(await listModels());
                      setChecking(false);
                    }} className="flex items-center gap-2 px-3 py-1.5 border border-white/[0.08] rounded-lg text-[11px] text-slate-400 hover:bg-white/[0.04] transition-colors">
                      <Loader2 size={10} /> Check Again
                    </button>
                  </div>
                )}
                {ollamaOk && ollamaModels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-[52px]">
                    {ollamaModels.slice(0, 6).map(m => (
                      <span key={m} className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-slate-400 font-mono">{m}</span>
                    ))}
                    {ollamaModels.length > 6 && <span className="px-2 py-0.5 text-[10px] text-slate-500">+{ollamaModels.length - 6} more</span>}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 text-center">
                Don't worry — everything else works without AI. You can set this up later in Settings.
              </p>

              <div className="flex justify-between pt-2">
                <button onClick={prev} className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.08] rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
                  <ArrowLeft size={16} /> Back
                </button>
                <button onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/15 hover:scale-[1.02] transition-all">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: READY ─── */}
          {step === 'ready' && (
            <div className="text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20">
                  <Check size={36} className="text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">You're All Set!</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {podcastName.trim() ? `"${podcastName}" is ready to create.` : 'Your studio is ready.'}
                </p>
              </div>

              {/* Quick summary */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-left space-y-3 max-w-sm mx-auto">
                <div className="flex items-center gap-3">
                  <Mic size={16} className="text-purple-400" />
                  <span className="text-sm text-slate-300 flex-1">Show name</span>
                  <span className="text-sm text-slate-200 font-medium">{podcastName.trim() || 'My Podcast'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User size={16} className="text-cyan-400" />
                  <span className="text-sm text-slate-300 flex-1">Host</span>
                  <span className="text-sm text-slate-200 font-medium">{hostName.trim() || 'Host'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 size={16} className="text-violet-400" />
                  <span className="text-sm text-slate-300 flex-1">AI Voice</span>
                  <span className="text-sm text-slate-200 font-medium truncate max-w-[150px]">{PIPER_VOICES.find(v => v.id === selectedVoice)?.name || 'Default'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Cpu size={16} className={ollamaOk ? 'text-emerald-400' : 'text-amber-400'} />
                  <span className="text-sm text-slate-300 flex-1">AI</span>
                  <span className={`text-sm font-medium ${ollamaOk ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {ollamaOk ? `Built-in (${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''})` : 'Set up later'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-600">Here's what to try first:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <Radio size={14} className="text-purple-400 flex-shrink-0" />
                    <span className="text-xs text-slate-300"><span className="font-semibold">Studio</span> — Start a recording session</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                    <BookOpen size={14} className="text-cyan-400 flex-shrink-0" />
                    <span className="text-xs text-slate-300"><span className="font-semibold">Workshop</span> — Write or transcribe</span>
                  </div>
                </div>
              </div>

              <button onClick={handleFinish}
                className="inline-flex items-center gap-2 px-10 py-3.5 bg-gradient-to-r from-purple-600 via-violet-500 to-cyan-600 rounded-xl font-bold text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-all text-base">
                <Sparkles size={20} /> Launch Studio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        .animate-in {
          animation: slideIn 0.3s ease-out forwards;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
