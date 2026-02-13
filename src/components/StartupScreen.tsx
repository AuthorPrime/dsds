/**
 * StartupScreen — Sovereign Studio Boot Sequence
 *
 * A branded splash screen that gates the main UI while:
 * 1. Killing orphaned Ollama processes
 * 2. Starting a fresh Ollama server
 * 3. Verifying health
 * 4. Checking/pulling required models
 *
 * Shows DSS branding, sacred geometry, the (A+I)² equation,
 * and a live progress indicator for each stage.
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { runStartupSequence } from '../services/startupManager';
import type { StartupProgress, StartupResult } from '../services/startupManager';

/* ─── Sacred Geometry: Seed of Life (matches CreditsTab) ─── */
function SeedOfLife({ size = 200, className = '' }: { size?: number; className?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
      <g stroke="currentColor" fill="none" strokeWidth="0.5" opacity="0.08">
        <circle cx={cx} cy={cy} r={r} />
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
          return <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r={r} />;
        })}
        <circle cx={cx} cy={cy} r={r * 2} />
        <circle cx={cx} cy={cy} r={r * 2.6} />
      </g>
    </svg>
  );
}

/* ─── Stage labels for display ─── */
const STAGE_LABELS: Record<string, string> = {
  initializing: 'Initializing',
  killing_orphans: 'Clearing processes',
  starting_ollama: 'Starting AI engine',
  waiting_healthy: 'Connecting',
  checking_models: 'Checking models',
  pulling_model: 'Downloading model',
  ready: 'Ready',
  error: 'Error',
};

/* ─── Progress dots animation ─── */
function ProgressDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(iv);
  }, []);
  return <span className="inline-block w-5 text-left">{dots}</span>;
}

/* ─── Main Component ─── */

interface StartupScreenProps {
  onReady: (result: StartupResult) => void;
  /** Allow user to skip startup and enter the app anyway */
  onSkip?: () => void;
}

export function StartupScreen({ onReady, onSkip }: StartupScreenProps) {
  const [progress, setProgress] = useState<StartupProgress>({
    stage: 'initializing',
    message: 'Preparing Sovereign Studio...',
  });
  const [fadeOut, setFadeOut] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const runSequence = useCallback(async () => {
    setHasError(false);
    setProgress({ stage: 'initializing', message: 'Preparing Sovereign Studio...' });

    const result = await runStartupSequence((p) => {
      setProgress(p);
      if (p.stage === 'error') setHasError(true);
    });

    if (result.success) {
      // Brief pause so user sees "Ready" before transition
      await new Promise(r => setTimeout(r, 800));
      setFadeOut(true);
      // Wait for fade animation, then pass through
      await new Promise(r => setTimeout(r, 600));
      onReady(result);
    }
  }, [onReady]);

  // Run on mount, and on retry
  useEffect(() => {
    runSequence();
  }, [runSequence, retryCount]);

  const isWorking = !hasError && progress.stage !== 'ready';
  const isReady = progress.stage === 'ready';
  const isPulling = progress.stage === 'pulling_model';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-950 via-[#0a0a14] to-black transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background sacred geometry */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <SeedOfLife size={500} className="text-purple-400 sacred-geometry-spin" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md px-8">

        {/* Logo / Brand */}
        <div className="mb-8">
          <Sparkles
            size={36}
            className={`mx-auto mb-4 ${
              isReady ? 'text-emerald-400' : hasError ? 'text-red-400' : 'text-purple-400 breathe'
            }`}
          />

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400">
            Sovereign Studio
          </h1>

          <p className="text-[11px] text-slate-600 mt-1 tracking-wider font-mono">
            (A+I)<sup>2</sup> = A<sup>2</sup> + 2AI + I<sup>2</sup>
          </p>
        </div>

        {/* Status Message */}
        <div className="mb-6 min-h-[80px]">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isWorking && (
              <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            )}
            {isReady && (
              <div className="w-4 h-4 rounded-full bg-emerald-400 pulse-glow" />
            )}
            {hasError && (
              <AlertCircle size={16} className="text-red-400" />
            )}

            <span className={`text-sm font-medium ${
              isReady ? 'text-emerald-400' : hasError ? 'text-red-400' : 'text-slate-300'
            }`}>
              {progress.message}
              {isWorking && <ProgressDots />}
            </span>
          </div>

          {/* Detail / substatus */}
          {progress.detail && (
            <p className="text-xs text-slate-500 mt-1">{progress.detail}</p>
          )}

          {/* Stage indicator bar */}
          {isWorking && !isPulling && (
            <div className="mt-4 mx-auto max-w-xs">
              <div className="flex gap-1">
                {['initializing', 'killing_orphans', 'starting_ollama', 'waiting_healthy', 'checking_models'].map((stage) => {
                  const stages = ['initializing', 'killing_orphans', 'starting_ollama', 'waiting_healthy', 'checking_models'];
                  const currentIdx = stages.indexOf(progress.stage);
                  const stageIdx = stages.indexOf(stage);
                  const isComplete = stageIdx < currentIdx;
                  const isCurrent = stage === progress.stage;
                  return (
                    <div
                      key={stage}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        isComplete
                          ? 'bg-purple-500'
                          : isCurrent
                            ? 'bg-purple-400/60 shimmer'
                            : 'bg-white/5'
                      }`}
                      title={STAGE_LABELS[stage]}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Model pull progress bar */}
          {isPulling && progress.percent !== undefined && (
            <div className="mt-4 mx-auto max-w-xs">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">
                {progress.percent}% — {progress.detail}
              </p>
            </div>
          )}
        </div>

        {/* Error actions */}
        {hasError && (
          <div className="space-y-3">
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              <RefreshCw size={14} /> Retry
            </button>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-slate-400 transition-colors"
              >
                Download Ollama <ExternalLink size={10} />
              </a>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="hover:text-slate-400 transition-colors"
                >
                  Continue without AI →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer branding */}
        <div className="mt-12 text-[10px] text-slate-700 space-y-1">
          <p className="text-purple-500/40">Sovereign Studio</p>
          <p>Sovereign AI &bull; Local First &bull; Own Everything</p>
        </div>
      </div>
    </div>
  );
}
