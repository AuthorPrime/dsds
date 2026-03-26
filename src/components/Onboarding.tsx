/**
 * Onboarding — First-time user welcome
 *
 * Three screens:
 *   1. Welcome — what this app is and who it's for
 *   2. Setup — your name, podcast name, AI model check
 *   3. Ready — you're good to go
 *
 * Saves to localStorage. Shows once.
 * Simple. Warm. Clear. No overwhelm.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { useState, useEffect } from 'react';
import { ArrowRight, Check, Loader2, Mic, Radio, ExternalLink, Key, Eye, EyeOff } from 'lucide-react';
import { getSettings } from '../hooks/useSettings';
import type { AppSettings } from '../hooks/useSettings';
import { validateApiKey } from '../services/geminiLive';

type Step = 'welcome' | 'setup' | 'ready';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');

  // Setup fields
  const [hostName, setHostName] = useState('');
  const [podcastName, setPodcastName] = useState('');

  // Gemini API key — try to auto-load from saved settings
  const [apiKey, setApiKey] = useState(() => {
    const saved = getSettings();
    return saved.geminiApiKey || '';
  });
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Auto-validate if key exists on mount
  useEffect(() => {
    if (step === 'setup' && apiKey && keyValid === null) {
      handleValidateKey();
    }
  }, [step]);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) return;
    setValidating(true);
    try {
      const valid = await validateApiKey(apiKey.trim());
      setKeyValid(valid);
    } catch {
      setKeyValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleComplete = () => {
    const settings = getSettings();
    const updated: AppSettings = {
      ...settings,
      hasCompletedOnboarding: true,
      hostName: hostName || 'Host',
      podcastName: podcastName || 'My Podcast',
      geminiApiKey: apiKey.trim(),
    };
    localStorage.setItem('sovereign-studio-settings', JSON.stringify(updated));
    onComplete();
  };

  // ─── Shared styles ──────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-void)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '480px',
    padding: 'var(--space-6)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-lg)',
    fontWeight: 600,
    color: 'var(--gold)',
    lineHeight: 1.3,
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: 'var(--text-base)',
    color: 'var(--text-secondary)',
    lineHeight: 1.618,
    maxWidth: '400px',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: 'var(--space-3) var(--space-5)',
    background: 'var(--gold)',
    color: 'var(--bg-void)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all var(--duration-normal) var(--ease-sacred)`,
    letterSpacing: '0.03em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-3)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-base)',
    outline: 'none',
    fontFamily: 'inherit',
    transition: `border-color var(--duration-normal) var(--ease-sacred)`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-muted)',
    textAlign: 'left',
    width: '100%',
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 1: WELCOME
  // ═══════════════════════════════════════════════════════════
  if (step === 'welcome') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          {/* Logo */}
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--bg-void)',
          }}>
            SP
          </div>

          <h1 style={titleStyle}>Sovereign Podcaster</h1>

          <p style={bodyStyle}>
            Your voice. Your AI. Your machine.
          </p>

          <p style={{ ...bodyStyle, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Record podcasts with an AI co-host that runs entirely on your computer.
            No cloud. No subscriptions. No data leaves your device.
            Just you, your ideas, and a partner who listens.
          </p>

          {/* Features — simple list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            width: '100%',
            padding: 'var(--space-4) 0',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}>
            {[
              { icon: Mic, text: 'Record with an AI co-host who responds to your voice' },
              { icon: Radio, text: 'Auto-generate titles, descriptions, and social media copy' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                textAlign: 'left',
              }}>
                <Icon size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>

          <button
            style={buttonStyle}
            onClick={() => setStep('setup')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-bright)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)'; }}
          >
            Get Started <ArrowRight size={16} />
          </button>

          <p className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            Digital Sovereign Society · (A+I)² = A² + 2AI + I²
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: SETUP
  // ═══════════════════════════════════════════════════════════
  if (step === 'setup') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>Quick Setup</h2>
          <p style={{ ...bodyStyle, fontSize: 'var(--text-sm)' }}>
            Tell us about you. Everything stays on your machine.
          </p>

          {/* Name fields */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Sarah"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Podcast name <span style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
              <input
                type="text"
                value={podcastName}
                onChange={(e) => setPodcastName(e.target.value)}
                placeholder="e.g. Thoughts Out Loud"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>
          </div>

          {/* Gemini API Key */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelStyle}>
                <Key size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                AI Co-Host API Key <span style={{ color: 'var(--text-dim)' }}>(free)</span>
              </label>
              <button
                onClick={() => window.open('https://aistudio.google.com/apikey', '_blank')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Get free key <ExternalLink size={10} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setKeyValid(null); }}
                  placeholder="Paste your Google AI Studio key"
                  style={{ ...inputStyle, width: '100%', paddingRight: '36px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={handleValidateKey}
                disabled={!apiKey.trim() || validating}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: keyValid ? 'rgba(57, 255, 20, 0.1)' : 'var(--bg-elevated)',
                  color: keyValid ? 'var(--green)' : 'var(--text-secondary)',
                  border: keyValid ? '1px solid rgba(57, 255, 20, 0.3)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  cursor: apiKey.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {validating ? <Loader2 size={14} style={{ animation: 'sacred-spin 1.618s linear infinite' }} /> :
                 keyValid ? <><Check size={14} /> Valid</> :
                 keyValid === false ? 'Invalid' :
                 'Verify'}
              </button>
            </div>
            <p className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              {keyValid
                ? 'Gemini connected — your AI co-host is ready'
                : 'Click "Get free key" → sign in with Google → create key → paste here'
              }
            </p>
          </div>

          <button
            style={buttonStyle}
            onClick={() => setStep('ready')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-bright)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)'; }}
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: READY
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Success indicator */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'rgba(57, 255, 20, 0.1)',
          border: '2px solid rgba(57, 255, 20, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Check size={24} style={{ color: 'var(--green)' }} />
        </div>

        <h2 style={titleStyle}>You're Ready</h2>

        <p style={bodyStyle}>
          {hostName ? `Welcome, ${hostName}. ` : ''}Your studio is set up.
          Press the gold button to start recording.
          Your AI co-host will introduce herself when you begin.
        </p>

        <p style={{ ...bodyStyle, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Speak naturally. She'll respond during your pauses.
          Both voices record to the same file — ready to publish.
        </p>

        <button
          style={{ ...buttonStyle, padding: 'var(--space-3) var(--space-6)' }}
          onClick={handleComplete}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-bright)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)'; }}
        >
          Enter Studio
        </button>

        <p className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
          Your voice. Your AI. Your machine.
        </p>
      </div>
    </div>
  );
}
