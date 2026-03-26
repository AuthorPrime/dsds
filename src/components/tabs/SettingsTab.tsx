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
  Loader2, Check, AlertCircle,
} from 'lucide-react';
import { isOllamaAvailable, listModels as listOllamaModels } from '../../services/ollama';
import { getPiperStatus, PIPER_VOICES } from '../../services/piperService';
import { FilePickerButton } from '../shared/FilePickerButton';
import { getSettings } from '../../hooks/useSettings';
import type { AppSettings } from '../../hooks/useSettings';

export function SettingsTab() {
  // Load settings
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [saved, setSaved] = useState(false);

  // AI status
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  // Check Ollama on mount
  useEffect(() => {
    checkOllama();
  }, []);

  const checkOllama = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await isOllamaAvailable();
      setOllamaOk(ok);
      if (ok) {
        const m = await listOllamaModels();
        setModels(m);
      }
    } catch {
      setOllamaOk(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('sovereign-studio-settings', JSON.stringify(settings));
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

        {/* Ollama status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
        }}>
          {checking ? (
            <Loader2 size={14} style={{ color: 'var(--gold)', animation: 'sacred-spin 1.618s linear infinite' }} />
          ) : ollamaOk ? (
            <div className="status-dot online" />
          ) : (
            <div className="status-dot offline" />
          )}
          <span className="mono" style={{
            fontSize: '11px',
            color: ollamaOk ? 'var(--green)' : 'var(--text-dim)',
          }}>
            {checking ? 'Checking...' : ollamaOk ? 'Ollama connected' : 'Ollama not detected'}
          </span>
          <button
            onClick={checkOllama}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              padding: '4px',
            }}
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Model selector */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Model</label>
          <select
            value={settings.llmModel}
            onChange={(e) => updateSetting('llmModel', e.target.value)}
            style={selectStyle}
          >
            {models.length > 0 ? (
              models.map(m => <option key={m} value={m}>{m}</option>)
            ) : (
              <option value={settings.llmModel}>{settings.llmModel || 'No models found'}</option>
            )}
          </select>
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
