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
  AlertCircle, Loader2, User, Globe,
} from 'lucide-react';
import { APP_BRAND } from '../branding';
import { getSettings, DEFAULTS } from '../hooks/useSettings';
import type { AppSettings } from '../hooks/useSettings';
import { isOllamaAvailable, listModels } from '../services/ollama';

// ─── Types ──────────────────────────────────────────────────────────
type Step = 'welcome' | 'brand' | 'ai' | 'ready';
const STEPS: Step[] = ['welcome', 'brand', 'ai', 'ready'];

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

          {/* ─── STEP 3: AI CHECK ─── */}
          {step === 'ai' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Cpu size={24} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">AI Engine Check</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Sovereign Studio uses local AI through Ollama. Let's check your setup.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
                {checking ? (
                  <div className="flex items-center gap-3 justify-center py-4">
                    <Loader2 size={20} className="text-cyan-400 animate-spin" />
                    <span className="text-slate-300 text-sm">Checking for Ollama...</span>
                  </div>
                ) : ollamaOk ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                        <Check size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-300">Ollama is running</p>
                        <p className="text-xs text-slate-500">{ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''} available</p>
                      </div>
                    </div>
                    {ollamaModels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ollamaModels.slice(0, 8).map(m => (
                          <span key={m} className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] text-slate-300 font-mono">{m}</span>
                        ))}
                        {ollamaModels.length > 8 && <span className="px-2.5 py-1 text-[11px] text-slate-500">+{ollamaModels.length - 8} more</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                        <AlertCircle size={18} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-300">Ollama not detected</p>
                        <p className="text-xs text-slate-500">AI features need Ollama running locally</p>
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-slate-400">Quick setup:</p>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-purple-400 font-bold mt-px">1.</span>
                          Download from <span className="text-cyan-400 font-mono">ollama.com</span>
                        </p>
                        <p className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-purple-400 font-bold mt-px">2.</span>
                          Run: <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-[11px] font-mono text-cyan-300">ollama serve</code>
                        </p>
                        <p className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-purple-400 font-bold mt-px">3.</span>
                          Pull a model: <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-[11px] font-mono text-cyan-300">ollama pull llama3.2</code>
                        </p>
                      </div>
                    </div>
                    <button onClick={async () => {
                      setChecking(true);
                      const ok = await isOllamaAvailable();
                      setOllamaOk(ok);
                      if (ok) setOllamaModels(await listModels());
                      setChecking(false);
                    }} className="flex items-center gap-2 px-4 py-2 border border-white/[0.08] rounded-lg text-xs text-slate-300 hover:bg-white/[0.04] transition-colors">
                      <Loader2 size={12} /> Check Again
                    </button>
                  </>
                )}
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Globe size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-300 font-medium">Cloud AI also available</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      You can also use Gemini or Claude APIs in Settings. Great for the AI co-host feature when you want real-time voice conversation.
                    </p>
                  </div>
                </div>
              </div>

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
                  <Cpu size={16} className={ollamaOk ? 'text-emerald-400' : 'text-amber-400'} />
                  <span className="text-sm text-slate-300 flex-1">Local AI</span>
                  <span className={`text-sm font-medium ${ollamaOk ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {ollamaOk ? `${ollamaModels.length} models` : 'Not yet'}
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
