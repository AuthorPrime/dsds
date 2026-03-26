/**
 * Settings Tab — Essential configuration only
 *
 * Four sections:
 *   1. AI Model — Ollama model selection
 *   2. Voice — Piper TTS voice for AI co-host
 *   3. Recording — Microphone, silence threshold
 *   4. Output — Save location
 *
 * Clean. No bloat. Every option has a reason.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Volume2, Mic, FolderOpen, Save, RefreshCw,
  Loader2, Check, AlertCircle, Key, ExternalLink, Eye, EyeOff,
} from 'lucide-react';
import { validateApiKey } from '../../services/geminiLive';
import { getPiperStatus, PIPER_VOICES } from '../../services/piperService';
import { FilePickerButton } from '../shared/FilePickerButton';
import { getSettings } from '../../hooks/useSettings';
import type { AppSettings } from '../../hooks/useSettings';

export function SettingsTab() {
  // Load settings
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [saved, setSaved] = useState(false);

  // Gemini API key
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  const handleValidateKey = useCallback(async () => {
    const key = settings.geminiApiKey;
    if (!key?.trim()) return;
    setValidating(true);
    try {
      const valid = await validateApiKey(key.trim());
      setKeyValid(valid);
    } catch {
      setKeyValid(false);
    } finally {
      setValidating(false);
    }
  }, [settings.geminiApiKey]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('dsds-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ─── Shared styles ──────────────────────────────────────────
  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-md)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-muted)',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    cursor: 'text',
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--gold)' }}>
          Settings
        </h2>
        <button
          onClick={handleSave}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: 'var(--space-2) var(--space-4)',
            background: saved ? 'rgba(57, 255, 20, 0.1)' : 'var(--gold)',
            color: saved ? 'var(--green)' : 'var(--bg-void)',
            border: saved ? '1px solid rgba(57, 255, 20, 0.3)' : 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: `all var(--duration-normal) var(--ease-sacred)`,
          }}
        >
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
        </button>
      </div>

      {/* ─── Section 1: AI Model ─── */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Cpu size={18} style={{ color: 'var(--gold)' }} />
          AI Co-Host
        </div>

        {/* Gemini API Key */}
        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={labelStyle}>
              <Key size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Gemini API Key
            </label>
            <button
              onClick={() => window.open('https://aistudio.google.com/apikey', '_blank')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontSize: '11px',
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
                value={settings.geminiApiKey || ''}
                onChange={(e) => { updateSetting('geminiApiKey', e.target.value); setKeyValid(null); }}
                placeholder="Paste your Google AI Studio key"
                style={{ ...inputStyle, width: '100%', paddingRight: '36px' }}
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
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={handleValidateKey}
              disabled={!settings.geminiApiKey?.trim() || validating}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: keyValid ? 'rgba(57, 255, 20, 0.1)' : 'var(--bg-elevated)',
                color: keyValid ? 'var(--green)' : 'var(--text-secondary)',
                border: keyValid ? '1px solid rgba(57, 255, 20, 0.3)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                cursor: settings.geminiApiKey?.trim() ? 'pointer' : 'default',
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
            Powers the AI co-host voice conversation · Free tier available
          </p>
        </div>

        {/* Silence threshold */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Pause before AI responds: {(settings.silenceThreshold / 1000).toFixed(1)}s
          </label>
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={settings.silenceThreshold}
            onChange={(e) => updateSetting('silenceThreshold', Number(e.target.value))}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'var(--text-dim)',
          }}>
            <span>Quick (0.5s)</span>
            <span>Patient (5s)</span>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Voice ─── */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Volume2 size={18} style={{ color: 'var(--gold)' }} />
          AI Voice
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Piper voice</label>
          <select
            value={settings.ttsVoice}
            onChange={(e) => updateSetting('ttsVoice', e.target.value)}
            style={selectStyle}
          >
            {PIPER_VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Section 3: Output ─── */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <FolderOpen size={18} style={{ color: 'var(--gold)' }} />
          Output
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Save recordings to</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              value={settings.outputFolder || '~/Documents/Sovereign Podcaster'}
              onChange={(e) => updateSetting('outputFolder', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <FilePickerButton
              onSelect={(path) => updateSetting('outputFolder', path)}
              label="Browse"
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <input
            type="checkbox"
            checked={settings.autoTranscribe}
            onChange={(e) => updateSetting('autoTranscribe', e.target.checked)}
            style={{ accentColor: 'var(--gold)' }}
          />
          <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Auto-transcribe after recording
          </label>
        </div>
      </div>

      {/* Footer note */}
      <p className="mono" style={{
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--text-dim)',
        padding: 'var(--space-3) 0',
      }}>
        All settings stored locally · Nothing leaves your machine
      </p>
    </div>
  );
}
