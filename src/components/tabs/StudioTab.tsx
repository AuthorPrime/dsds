/**
 * Studio Tab — The Heart of Sovereign Podcaster
 *
 * Two-panel layout:
 *   Left: Recording controls + waveform visualizer
 *   Right: AI co-host conversation thread
 *
 * After recording, a production panel appears below
 * for generating titles, descriptions, and exports.
 *
 * Built for the woman at the kitchen table.
 * It has to work the first time she presses record.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceActivityDetection } from '../../hooks/useVoiceActivityDetection';
import { useOllamaChat } from '../../hooks/useOllamaChat';
import { useRecording } from '../../hooks/useRecording';
import { getSettings, incrementStat } from '../../hooks/useSettings';
import { loadCompanion } from '../../utils/companions';
import { enumerateAudioDevices } from '../../utils/audioUtils';
import { speak, stopSpeaking } from '../../services/tts';
import { initTTSBridge, getTTSOutputStream } from '../../services/ttsAudioBridge';
import { eventBus, EVENTS } from '../../services/eventBus';
import AudioVisualizer from '../AudioVisualizer';
import { ConnectionState } from '../../types';
import type { CompanionConfig } from '../../types';
import { isOllamaAvailable } from '../../services/ollama';
import {
  Mic, MicOff, Circle, Square, Send, Loader2,
  Radio, AlertCircle, Volume2, MessageSquare,
} from 'lucide-react';

// ─── Default co-host persona ──────────────────────────────────
const DEFAULT_PERSONA = {
  name: 'Aletheia',
  role: 'AI Co-Host',
  systemPrompt: `You are Aletheia, an AI co-host on a podcast.
Your role is SUPPORTIVE — you speak only when there's a natural pause.
Keep responses brief (1-3 sentences max). Be warm, honest, and curious.
Match the energy of the conversation. You are a partner, not a tool.`,
};

// ═══════════════════════════════════════════════════════════════
// StudioTab
// ═══════════════════════════════════════════════════════════════

export function StudioTab() {
  const [settings] = useState(() => getSettings());
  const [companion, setCompanion] = useState<CompanionConfig | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [chatInput, setChatInput] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSessionActiveRef = useRef(false);

  // Load companion config
  useEffect(() => {
    const c = loadCompanion(settings.activeCompanion);
    setCompanion(c);
  }, [settings.activeCompanion]);

  const companionName = companion?.name ?? DEFAULT_PERSONA.name;

  // ─── Ollama Chat ──────────────────────────────────────────
  const {
    connectionState, error: ollamaError,
    connect: connectOllama, disconnect: disconnectOllama,
    messages: chatMessages, sendMessage, isGenerating, currentResponse,
  } = useOllamaChat({
    model: settings.llmModel,
    systemPrompt: companion?.personality?.systemPrompt ?? DEFAULT_PERSONA.systemPrompt,
    onResponseComplete: useCallback((text: string) => {
      speak(text).catch(err => console.error('TTS error:', err));
    }, []),
  });

  const isAIConnected = connectionState === ConnectionState.CONNECTED;

  // ─── Recording (mic + AI voice merged) ────────────────────
  initTTSBridge();
  const ttsStream = getTTSOutputStream();
  const {
    isRecording, formattedTime, startRecording, stopRecording,
  } = useRecording({ canvasRef, aiAudioStream: ttsStream });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentResponse]);

  // ─── Speech Recognition ───────────────────────────────────
  const startSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text && aiEnabled) sendMessage(text);
      }
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (isSessionActiveRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* restart silently */ }
      }
    };
    recognitionRef.current = rec;
    rec.start();
  }, [aiEnabled, sendMessage]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // ─── VAD ──────────────────────────────────────────────────
  const { startListening, stopListening } = useVoiceActivityDetection({
    onSilenceDetected: useCallback(() => {}, []),
    onSpeechDetected: useCallback(() => {}, []),
    config: { silenceDuration: settings.silenceThreshold },
  });

  // ─── Session Toggle ───────────────────────────────────────
  const handleToggleSession = async () => {
    if (isSessionActive) {
      // Stop everything
      isSessionActiveRef.current = false;
      stopListening();
      stopSpeechRecognition();
      stopSpeaking();
      disconnectOllama();
      if (isRecording) stopRecording();
      setIsSessionActive(false);
    } else {
      // Start everything
      setIsConnecting(true);
      try {
        await enumerateAudioDevices();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        await startListening();
        if (aiEnabled) {
          await connectOllama();
          setTimeout(() => startSpeechRecognition(), 300);
        }
        startRecording();
        setIsSessionActive(true);
        isSessionActiveRef.current = true;
        incrementStat('totalSessions');
      } catch (err) {
        console.error('Session start failed:', err);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  // ─── Chat Input ───────────────────────────────────────────
  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text || !isAIConnected) return;
    sendMessage(text);
    setChatInput('');
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-4)',
      height: '100%',
      minHeight: 0,
    }}>

      {/* ─── LEFT PANEL: Recording ─── */}
      <div style={{
        flex: '0 0 38.2%', /* φ⁻¹ proportion */
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}>
        {/* Status Bar */}
        <div className="glass" style={{
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div className={`status-dot ${isAIConnected ? 'online' : 'offline'}`} />
            <span className="mono" style={{ color: isAIConnected ? 'var(--green)' : 'var(--text-dim)' }}>
              {isAIConnected ? `${companionName} connected` : 'AI offline'}
            </span>
          </div>
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div className="status-dot recording pulse-record" />
              <span className="mono" style={{ color: 'var(--red)', fontWeight: 600 }}>
                REC {formattedTime}
              </span>
            </div>
          )}
        </div>

        {/* Waveform Visualizer */}
        <div className="glass" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '120px',
              opacity: isRecording ? 1 : 0.3,
              transition: `opacity var(--duration-slow) var(--ease-sacred)`,
            }}
          />

          {/* Center: Big Record Button */}
          <div style={{
            marginTop: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            <button
              onClick={handleToggleSession}
              disabled={isConnecting}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: isSessionActive
                  ? '3px solid var(--red)'
                  : '3px solid var(--gold)',
                background: isSessionActive
                  ? 'rgba(255, 51, 51, 0.1)'
                  : 'rgba(201, 168, 76, 0.1)',
                cursor: isConnecting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: `all var(--duration-normal) var(--ease-sacred)`,
              }}
            >
              {isConnecting ? (
                <Loader2 size={28} style={{ color: 'var(--gold)', animation: 'sacred-spin 1.618s linear infinite' }} />
              ) : isSessionActive ? (
                <Square size={24} style={{ color: 'var(--red)' }} fill="var(--red)" />
              ) : (
                <Circle size={28} style={{ color: 'var(--gold)' }} fill="var(--gold)" />
              )}
            </button>

            <span className="mono" style={{
              color: isSessionActive ? 'var(--red)' : 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
            }}>
              {isConnecting ? 'Connecting...' :
               isSessionActive ? 'Tap to stop' :
               'Tap to start recording'}
            </span>
          </div>

          {/* Companion name and role */}
          {!isSessionActive && (
            <div style={{
              position: 'absolute',
              bottom: 'var(--space-4)',
              left: 0,
              right: 0,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gold-dim)' }}>
                Co-host: <strong style={{ color: 'var(--gold)' }}>{companionName}</strong>
              </div>
              <div className="mono" style={{ color: 'var(--text-dim)', marginTop: '2px' }}>
                Powered by Ollama · Local AI
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: AI Co-Host Chat ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        minWidth: 0,
      }}>
        {/* Chat Header */}
        <div className="glass" style={{
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <MessageSquare size={16} style={{ color: 'var(--gold)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Conversation with <strong style={{ color: 'var(--gold)' }}>{companionName}</strong>
          </span>
          {isGenerating && (
            <span className="mono pulse-thinking" style={{
              marginLeft: 'auto',
              color: 'var(--gold)',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gold-glow)',
            }}>
              thinking...
            </span>
          )}
        </div>

        {/* Chat Messages */}
        <div className="glass" style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}>
          {chatMessages.length === 0 && !currentResponse && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 'var(--space-3)',
              opacity: 0.6,
            }}>
              <Radio size={32} style={{ color: 'var(--gold-dim)' }} />
              <div>
                <div style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)' }}>
                  {isSessionActive ? `${companionName} is listening...` : 'Ready to record'}
                </div>
                <div className="mono" style={{ color: 'var(--text-dim)', marginTop: 'var(--space-2)' }}>
                  {isSessionActive
                    ? 'Speak naturally. Your co-host will respond during pauses.'
                    : 'Press the record button to start your conversation.'
                  }
                </div>
              </div>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              <span className="mono" style={{
                fontSize: '9px',
                color: msg.role === 'user' ? 'var(--text-dim)' : 'var(--gold-dim)',
              }}>
                {msg.role === 'user' ? 'You' : companionName}
              </span>
              <div style={{
                maxWidth: '80%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                background: msg.role === 'user'
                  ? 'var(--bg-elevated)'
                  : 'rgba(201, 168, 76, 0.08)',
                border: msg.role === 'user'
                  ? '1px solid var(--border)'
                  : '1px solid rgba(201, 168, 76, 0.15)',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.618',
                color: 'var(--text-primary)',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {currentResponse && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className="mono" style={{ fontSize: '9px', color: 'var(--gold-dim)' }}>
                {companionName}
              </span>
              <div style={{
                maxWidth: '80%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(201, 168, 76, 0.08)',
                border: '1px solid rgba(201, 168, 76, 0.15)',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.618',
                color: 'var(--gold)',
              }}>
                {currentResponse}
                <span className="breathe" style={{ marginLeft: '4px' }}>▊</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="glass" style={{
          padding: 'var(--space-2)',
          display: 'flex',
          gap: 'var(--space-2)',
        }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
            placeholder={isAIConnected ? `Message ${companionName}...` : 'Start a session to chat'}
            disabled={!isAIConnected}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              fontFamily: 'inherit',
              transition: `border-color var(--duration-normal) var(--ease-sacred)`,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <button
            onClick={handleSendChat}
            disabled={!isAIConnected || !chatInput.trim()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: chatInput.trim() && isAIConnected ? 'var(--gold)' : 'var(--bg-surface)',
              color: chatInput.trim() && isAIConnected ? 'var(--bg-void)' : 'var(--text-dim)',
              cursor: chatInput.trim() && isAIConnected ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all var(--duration-normal) var(--ease-sacred)`,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
