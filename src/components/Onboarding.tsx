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
  Loader2, User, Globe, Volume2,
} from 'lucide-react';
import { APP_BRAND } from '../branding';
import { getSettings, DEFAULTS } from '../hooks/useSettings';
import type { AppSettings } from '../hooks/useSettings';
import { isOllamaAvailable, listModels } from '../services/ollama';
import { speak, stopSpeaking, getBrowserVoices } from '../services/tts';

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
    <div className="flex items-center gap-2 justify-center">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
            ${i < idx
              ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/20'
              : i === idx
                ? 'border-2 border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-2 border-gray-700/60 text-gray-600'
            }
          `}>
            {i < idx ? <Check size={14} /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-0.5 rounded transition-all duration-500 ${i < idx ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-gray-800'}`} />
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
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-${accent}/30 transition-all`}>
      <div className={`p-2 rounded-lg bg-${accent}/10 text-${accent} flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

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

  // Load voices when we reach the voice step
  useEffect(() => {
    if (step === 'voice') {
      const loadVoices = () => {
        const available = getBrowserVoices();
        if (available.length > 0) {
          setVoices(available);
          if (!selectedVoice && available.length > 0) {
            setSelectedVoice(available[0].name);
          }
        }
      };
      loadVoices();
      // Voices may load asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, [step, selectedVoice]);

  const previewVoice = (voiceName: string) => {
    stopSpeaking();
    setPreviewPlaying(voiceName);
    const sampleText = podcastName.trim()
      ? `Welcome to ${podcastName}. I'm your AI co-host, and I'm excited to create with you today.`
      : `Welcome to your new podcast. I'm your AI co-host, and I'm excited to create with you today.`;
    speak(sampleText, voiceName).then(() => setPreviewPlaying(null)).catch(() => setPreviewPlaying(null));
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

      <div className="relative z-10 max-w-xl w-full mx-6">
        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator current={step} steps={STEPS} />
        </div>

        {/* Step content */}
        <div className={`transition-all duration-300 ${fadeClass}`}>
          {/* ─── STEP 1: WELCOME ─── */}
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="relative inline-block">
                <Sparkles size={48} className="text-purple-400 breathe mx-auto" />
              </div>

              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400">
                  Welcome to Sovereign Studio
                </h1>
                <p className="text-slate-500 text-sm mt-2">
                  Your AI-powered creative studio. Record, write, and publish — all from your machine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
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
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 via-violet-500 to-cyan-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all">
                Get Started <ArrowRight size={18} />
              </button>

              <p className="text-[11px] text-slate-600">v{APP_BRAND.version}</p>
            </div>
          )}

          {/* ─── STEP 2: BRAND SETUP ─── */}
          {step === 'brand' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <User size={24} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Set Up Your Brand</h2>
                <p className="text-slate-500 text-sm mt-1">
                  This personalizes your AI-generated content, exports, and thumbnails.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                    Show / Podcast Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={podcastName}
                    onChange={(e) => setPodcastName(e.target.value)}
                    placeholder="e.g. The Creative Hour, Tech Talk Daily..."
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-600 mt-1">Used in episode titles, descriptions, and social posts</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                    Your Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Sarah Chen, Marcus Johnson..."
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                  <p className="text-[11px] text-slate-600 mt-1">Appears as host name in AI prompts and exported documents</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                    Organization <span className="text-slate-600 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. CreativeWorks Inc, The Knowledge Hub..."
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                  <p className="text-[11px] text-slate-600 mt-1">Included in document headers and thumbnails</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 text-center">
                You can change these anytime in Settings → Your Brand
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

          {/* ─── STEP 3: VOICE ─── */}
          {step === 'voice' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Volume2 size={24} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Choose Your AI Voice</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Pick how your AI co-host sounds. Tap any voice to preview it.
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {voices.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 size={20} className="text-slate-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading available voices...</p>
                  </div>
                ) : (
                  voices.filter(v => v.lang.startsWith('en')).slice(0, 12).map((voice) => (
                    <button
                      key={voice.name}
                      onClick={() => {
                        setSelectedVoice(voice.name);
                        previewVoice(voice.name);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        selectedVoice === voice.name
                          ? 'bg-purple-900/30 border border-purple-500/40 shadow-md shadow-purple-500/10'
                          : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedVoice === voice.name ? 'bg-purple-500/20' : 'bg-white/[0.04]'
                      }`}>
                        {previewPlaying === voice.name ? (
                          <Loader2 size={14} className="text-purple-400 animate-spin" />
                        ) : selectedVoice === voice.name ? (
                          <Check size={14} className="text-purple-400" />
                        ) : (
                          <Volume2 size={14} className="text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{voice.name}</p>
                        <p className="text-[11px] text-slate-500">{voice.lang}</p>
                      </div>
                      {!voice.localService && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">HD</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              <p className="text-xs text-slate-600 text-center">
                You can change this anytime in Settings. More voices available with Piper TTS.
              </p>

              <div className="flex justify-between pt-2">
                <button onClick={() => { stopSpeaking(); prev(); }} className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.08] rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
                  <ArrowLeft size={16} /> Back
                </button>
                <button onClick={() => { stopSpeaking(); next(); }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/15 hover:scale-[1.02] transition-all">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: AI CHECK ─── */}
          {step === 'ai' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Cpu size={24} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Connect Your AI</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Choose how your AI assistant connects. You can change this anytime.
                </p>
              </div>

              {/* Option 1: Gemini (Easy) */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                    <Globe size={18} className="text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-cyan-300">Gemini AI</p>
                    <p className="text-xs text-slate-500">Free tier available. Best for voice conversations.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Recommended</span>
                </div>
                <p className="text-xs text-slate-400 pl-[52px]">
                  Get a free API key at <span className="text-cyan-400 font-medium">aistudio.google.com</span> — paste it in Settings after setup.
                </p>
              </div>

              {/* Option 2: Ollama (Advanced) */}
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
                      Ollama (Local AI) {ollamaOk ? `— ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''} ready` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ollamaOk ? 'Running on your machine. 100% private.' : 'Runs entirely on your computer. No internet needed.'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-slate-400 border border-white/[0.08]">Advanced</span>
                </div>
                {!ollamaOk && !checking && (
                  <div className="pl-[52px] space-y-2">
                    <p className="text-xs text-slate-500">
                      Download from <span className="text-cyan-400 font-medium">ollama.com</span> and it will auto-detect.
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
                  <span className="text-sm text-slate-200 font-medium truncate max-w-[150px]">{selectedVoice || 'Default'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Cpu size={16} className={ollamaOk ? 'text-emerald-400' : 'text-amber-400'} />
                  <span className="text-sm text-slate-300 flex-1">AI Engine</span>
                  <span className={`text-sm font-medium ${ollamaOk ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {ollamaOk ? `Ollama (${ollamaModels.length} models)` : 'Set up later'}
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
