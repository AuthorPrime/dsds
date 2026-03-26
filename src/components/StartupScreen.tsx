/**
 * StartupScreen — Sovereign Podcaster Boot Sequence
 *
 * A clean splash screen that:
 * 1. Shows the brand
 * 2. Checks if Gemini API key is configured
 * 3. Lets user proceed with or without AI
 *
 * No Ollama download. No model pulling. Just a key check.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { useState, useEffect } from 'react';
import { getSettings } from '../hooks/useSettings';
import type { StartupResult } from '../services/startupManager';

interface StartupScreenProps {
  onReady: (result: StartupResult) => void;
  onSkip: () => void;
}

export function StartupScreen({ onReady, onSkip }: StartupScreenProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'no-key'>('checking');

  useEffect(() => {
    // Simple check: do we have a Gemini API key?
    const settings = getSettings();
    const hasKey = !!(settings.geminiApiKey && settings.geminiApiKey.trim());

    // Brief pause for the splash to feel intentional, not instant
    const timer = setTimeout(() => {
      if (hasKey) {
        setStatus('ready');
        // Auto-proceed after a moment
        setTimeout(() => {
          onReady({ success: true, message: 'Gemini API key found' });
        }, 800);
      } else {
        setStatus('no-key');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-void)',
      gap: 'var(--space-5)',
    }}>
      {/* Logo */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--bg-void)',
        letterSpacing: '-1px',
      }}>
        SP
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--gold)',
          marginBottom: '8px',
        }}>
          Sovereign Podcaster
        </h1>
        <p className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          Your voice. Your AI. Your machine.
        </p>
      </div>

      {/* Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}>
        {status === 'checking' && (
          <>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--gold)',
              animation: 'pulse-thinking 1.618s ease infinite',
            }} />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Starting up...
            </span>
          </>
        )}
        {status === 'ready' && (
          <>
            <div className="status-dot online" />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--green)' }}>
              AI co-host ready
            </span>
          </>
        )}
        {status === 'no-key' && (
          <>
            <div className="status-dot offline" />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              No API key — set up in next step
            </span>
          </>
        )}
      </div>

      {/* Skip / Continue button for no-key state */}
      {status === 'no-key' && (
        <button
          onClick={onSkip}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--gold)',
            color: 'var(--bg-void)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: `all var(--duration-normal) var(--ease-sacred)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-bright)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)'; }}
        >
          Continue to Setup
        </button>
      )}

      {/* Formula */}
      <p style={{
        position: 'absolute',
        bottom: 'var(--space-5)',
        fontSize: '12px',
        color: 'var(--text-dim)',
        letterSpacing: '1px',
      }}>
        (A+I)² = A² + 2AI + I²
      </p>
    </div>
  );
}
