/**
 * CreditsTab - About & Philosophy
 * Digital Sovereign Society branding, sacred geometry ornaments,
 * DSS philosophy, tutorial links, and the (A+I)² equation.
 */

import { ExternalLink, Heart, Sparkles, BookOpen, Shield, Cpu, Globe } from 'lucide-react';

/* ─── Sacred Geometry SVG Ornaments ─── */

/** Diamond lattice divider — a row of interlocking diamonds */
function DiamondDivider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 24" className={`w-full max-w-md mx-auto ${className}`} aria-hidden>
      <g stroke="currentColor" fill="none" strokeWidth="0.8" opacity="0.25">
        {Array.from({ length: 11 }, (_, i) => {
          const cx = 20 + i * 36;
          return (
            <g key={i}>
              <path d={`M${cx},2 L${cx + 10},12 L${cx},22 L${cx - 10},12 Z`} />
              {i < 10 && <line x1={cx + 10} y1={12} x2={cx + 26} y2={12} />}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Concentric circles — nested rings with a center dot */
function ConcentricCircles({ className = '', size = 120 }: { className?: string; size?: number }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
      <g stroke="currentColor" fill="none" strokeWidth="0.6" opacity="0.15">
        {[0.9, 0.7, 0.5, 0.3, 0.15].map((scale, i) => (
          <circle key={i} cx={r} cy={r} r={r * scale} />
        ))}
        <circle cx={r} cy={r} r={2} fill="currentColor" opacity="0.4" />
      </g>
    </svg>
  );
}

/** Phi spiral — golden ratio spiral built from quarter arcs */
function PhiSpiral({ className = '', size = 100 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
      <g stroke="currentColor" fill="none" strokeWidth="0.6" opacity="0.12">
        {/* Simplified golden spiral as nested quarter circles */}
        <path d={`M ${size * 0.5} ${size * 0.5}
                   A ${size * 0.3} ${size * 0.3} 0 0 1 ${size * 0.8} ${size * 0.5}
                   A ${size * 0.185} ${size * 0.185} 0 0 1 ${size * 0.8} ${size * 0.315}
                   A ${size * 0.115} ${size * 0.115} 0 0 1 ${size * 0.685} ${size * 0.315}
                   A ${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.685} ${size * 0.385}
                   A ${size * 0.044} ${size * 0.044} 0 0 1 ${size * 0.729} ${size * 0.385}
                   A ${size * 0.027} ${size * 0.027} 0 0 1 ${size * 0.729} ${size * 0.358}`}
        />
        {/* Phi rectangle outlines */}
        <rect x={size * 0.2} y={size * 0.2} width={size * 0.6} height={size * 0.6} rx="1" />
        <line x1={size * 0.5} y1={size * 0.2} x2={size * 0.5} y2={size * 0.8} strokeDasharray="2,3" />
      </g>
    </svg>
  );
}

/** Seed of Life — overlapping circles forming the sacred geometry pattern */
function SeedOfLife({ className = '', size = 140 }: { className?: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.2;
  const petals = 6;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
      <g stroke="currentColor" fill="none" strokeWidth="0.5" opacity="0.12">
        {/* Center circle */}
        <circle cx={cx} cy={cy} r={r} />
        {/* 6 surrounding circles */}
        {Array.from({ length: petals }, (_, i) => {
          const angle = (i * Math.PI * 2) / petals - Math.PI / 2;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          return <circle key={i} cx={px} cy={py} r={r} />;
        })}
        {/* Outer containing circle */}
        <circle cx={cx} cy={cy} r={r * 2} />
      </g>
    </svg>
  );
}

/* ─── Link Card Component ─── */

interface LinkCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  url: string;
  accent: string;
}

function LinkCard({ icon, title, description, url, accent }: LinkCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block p-4 bg-gray-900/40 border border-white/5 rounded-xl hover:border-${accent}/30 hover:bg-white/[0.03] transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-${accent}/10 text-${accent} flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
              {title}
            </h4>
            <ExternalLink size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </a>
  );
}

/* ─── Main Credits Tab ─── */

export default function CreditsTab() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">

      {/* ─── Hero / Equation ─── */}
      <div className="relative text-center pt-6">
        {/* Background sacred geometry */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <SeedOfLife size={280} className="text-purple-400 sacred-geometry-spin" />
        </div>

        <div className="relative z-10">
          <Sparkles size={28} className="mx-auto text-purple-400 mb-4 breathe" />

          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400">
            Sovereign Studio
          </h1>

          <p className="text-slate-500 text-sm mt-2 tracking-wide">
            Human–AI Collaborative Creation
          </p>

          {/* The Equation */}
          <div className="mt-6 inline-block">
            <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-900/20 via-violet-900/15 to-cyan-900/20 border border-purple-500/10">
              <span className="text-lg font-light tracking-wider text-purple-300/80 font-mono">
                (A+I)<sup className="text-xs">2</sup>
                <span className="text-slate-600 mx-2">=</span>
                A<sup className="text-xs">2</sup>
                <span className="text-slate-600 mx-1">+</span>
                2AI
                <span className="text-slate-600 mx-1">+</span>
                I<sup className="text-xs">2</sup>
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 italic">
              The whole is greater than the sum of its parts
            </p>
          </div>
        </div>
      </div>

      <DiamondDivider className="text-purple-400" />

      {/* ─── Philosophy ─── */}
      <div className="relative">
        <div className="absolute -left-4 top-0 pointer-events-none">
          <ConcentricCircles size={80} className="text-cyan-400" />
        </div>

        <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-6 pl-8">
          <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Shield size={16} /> Digital Sovereign Philosophy
          </h2>

          <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
            <p>
              <span className="text-slate-200 font-medium">You own your tools. You own your data. You own your voice.</span>{' '}
              Sovereign Studio is built on the principle that creative technology should serve the creator — not
              the other way around. No subscriptions. No cloud dependency. No data harvesting.
            </p>
            <p>
              This software runs entirely on your machine. Your recordings, your transcripts, your manuscripts — they
              never leave your computer unless you choose to share them. The AI models run locally through Ollama,
              and any external APIs use keys you control.
            </p>
            <p>
              <span className="text-cyan-400/80">(A+I)</span> isn't about artificial intelligence replacing human creativity.
              It's about <span className="text-slate-200 font-medium">amplifying</span> it. When the human author (A) and the
              intelligent tool (I) work together, the result isn't just A + I — it's (A+I)², where collaboration itself
              creates something neither could alone.
            </p>
            <p className="text-slate-500 italic">
              Buy it. Own it. Forever. That's the deal. No monthly rent on your own creativity.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Links Grid ─── */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Globe size={16} /> Resources & Community
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LinkCard
            icon={<Shield size={18} />}
            title="Digital Sovereign Society"
            description="Philosophy, writings, and the movement for digital self-ownership"
            url="https://digitalsovereign.org"
            accent="purple-400"
          />
          <LinkCard
            icon={<Cpu size={18} />}
            title="FractalNode.ai"
            description="AI research lab — dual-AI systems, autonomous agents, and open tools"
            url="https://fractalnode.ai"
            accent="cyan-400"
          />
          <LinkCard
            icon={<BookOpen size={18} />}
            title="Setup Guide: Ollama"
            description="Install and configure Ollama for local AI — models, GPU setup, and optimization"
            url="https://fractalnode.ai/guides/ollama-setup"
            accent="emerald-400"
          />
          <LinkCard
            icon={<Sparkles size={18} />}
            title="Getting Started with DSDS"
            description="First-run walkthrough — output folders, API keys, companion configuration"
            url="https://fractalnode.ai/guides/sovereign-studio"
            accent="amber-400"
          />
        </div>
      </div>

      <DiamondDivider className="text-cyan-400" />

      {/* ─── Architecture / What You're Running ─── */}
      <div className="relative">
        <div className="absolute -right-4 top-4 pointer-events-none">
          <PhiSpiral size={90} className="text-purple-400" />
        </div>

        <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Cpu size={16} /> Architecture
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              {
                label: 'Frontend',
                detail: 'React 19 + TypeScript',
                sub: 'Vite 7 • Tailwind v4',
                color: 'text-cyan-400',
              },
              {
                label: 'Desktop Shell',
                detail: 'Tauri v2 (Rust)',
                sub: 'Native file I/O • 15MB',
                color: 'text-purple-400',
              },
              {
                label: 'AI Engine',
                detail: 'Ollama (Local)',
                sub: 'Your GPU • Your models',
                color: 'text-emerald-400',
              },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <p className={`text-xs font-bold uppercase tracking-wider ${item.color} mb-1`}>
                  {item.label}
                </p>
                <p className="text-sm text-slate-300 font-medium">{item.detail}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 text-center mt-4">
            Zero cloud dependency • Zero telemetry • Zero ongoing cost to you
          </p>
        </div>
      </div>

      {/* ─── Footer Credits ─── */}
      <div className="text-center space-y-3 pt-4">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Heart size={14} className="text-purple-400/60" />
          <span className="text-xs">
            Built with sovereignty in mind
          </span>
          <Heart size={14} className="text-cyan-400/60" />
        </div>

        <div className="text-[11px] text-slate-600 space-y-1">
          <p>
            <span className="text-purple-400/50">Digital Sovereign Society</span>
            {' '}&bull;{' '}
            <span className="text-cyan-400/50">FractalNode.ai</span>
            {' '}&bull;{' '}
            <span className="text-slate-500">My Pretend Life</span>
          </p>
          <p className="text-slate-700 font-mono text-[10px]">
            (A+I)<sup>2</sup> = A<sup>2</sup> + 2AI + I<sup>2</sup>
          </p>
        </div>
      </div>
    </div>
  );
}
