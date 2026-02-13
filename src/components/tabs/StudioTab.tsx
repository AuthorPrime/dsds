/**
 * Studio Tab — Merged Record + Production
 * Sub-tabs: Record | Produce (both stay mounted, visibility toggled)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceActivityDetection } from '../../hooks/useVoiceActivityDetection';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import { useOllamaChat } from '../../hooks/useOllamaChat';
import { useRecording } from '../../hooks/useRecording';
import { getSettings, incrementStat } from '../../hooks/useSettings';
import { loadCompanion } from '../../utils/aiProviders';
import { enumerateAudioDevices } from '../../utils/audioUtils';
import { speak } from '../../services/tts';
import { eventBus, EVENTS } from '../../services/eventBus';
import AudioVisualizer from '../AudioVisualizer';
import { ConnectionState } from '../../types';
import type { CompanionConfig } from '../../types';
import { ProductionPipeline } from '../../services/pipeline';
import type { PipelineState, PipelineStage, EpisodePackage } from '../../services/pipeline';
import { isOllamaAvailable, listModels } from '../../services/ollama';
import { saveBlob } from '../../services/fileManager';
import {
  MicOff, Radio, Users, Cpu, AlertCircle,
  Video, Camera, Monitor, Circle, Square,
  Settings as SettingsIcon, Volume2, MessageSquare, Send, Loader2,
  Wand2, Play, RotateCcw, Copy, Check, ChevronDown, ChevronUp,
  FileText, Hash, BookOpen, Share2, Image, Package, CheckCircle, Download,
} from 'lucide-react';

// ─── Sub-tab types ──────────────────────────────────────────────────
type SubTab = 'record' | 'produce';

// ─── Production singleton ───────────────────────────────────────────
const pipeline = new ProductionPipeline();

const STAGE_LABELS: Record<string, string> = {
  idle: 'Ready to produce',
  transcribing: 'Processing transcript',
  generating_title: 'Crafting episode title',
  generating_description: 'Writing description',
  generating_show_notes: 'Compiling show notes',
  generating_social: 'Creating social posts',
  generating_thumbnail: 'Preparing thumbnail',
  packaging: 'Packaging episode',
  complete: 'Episode complete!',
  error: 'Error occurred',
};

const PIPELINE_STEPS: { stage: PipelineStage; label: string; icon: typeof FileText }[] = [
  { stage: 'transcribing', label: 'Transcript', icon: FileText },
  { stage: 'generating_title', label: 'Title', icon: Hash },
  { stage: 'generating_description', label: 'Description', icon: BookOpen },
  { stage: 'generating_show_notes', label: 'Notes', icon: FileText },
  { stage: 'generating_social', label: 'Social', icon: Share2 },
  { stage: 'generating_thumbnail', label: 'Thumbnail', icon: Image },
  { stage: 'packaging', label: 'Package', icon: Package },
];

function getStepStatus(step: PipelineStage, currentStage: PipelineStage): 'completed' | 'active' | 'pending' {
  const order = PIPELINE_STEPS.map(s => s.stage);
  const stepIdx = order.indexOf(step);
  const currentIdx = order.indexOf(currentStage);
  if (currentStage === 'complete') return 'completed';
  if (currentStage === 'idle' || currentStage === 'error') return 'pending';
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

// Fallback persona
const DEFAULT_PERSONA = {
  id: 'aletheia',
  name: 'Aletheia',
  role: 'AI Co-Host',
  description: 'Sovereign AI support',
  voiceName: 'Kore' as const,
  systemInstruction: `You are Aletheia, an AI co-host on a podcast.
Your role is SUPPORTIVE - you speak only when there's a natural pause in conversation.
Keep responses brief (1-3 sentences max). Match the energy of the conversation.`,
};

// ─── Shared mini-components ─────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Copy to clipboard">
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
    </button>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, accentColor = 'border-l-purple-500' }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border border-white/[0.06] rounded-lg overflow-hidden border-l-4 ${accentColor}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors">
        <span className="font-medium text-sm text-slate-200">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/[0.04]">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main StudioTab
// ═══════════════════════════════════════════════════════════════════

interface StudioTabProps {
  apiKey: string;
}

export function StudioTab({ apiKey: envApiKey }: StudioTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('record');

  // ─── RECORD state ──────────────────────────────────────────────
  const [settings] = useState(() => getSettings());
  const effectiveApiKey = settings.geminiApiKey || envApiKey;
  const isOllamaMode = settings.llmProvider === 'ollama';

  const [companion, setCompanion] = useState<CompanionConfig | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [silenceThreshold, setSilenceThreshold] = useState(settings.silenceThreshold);
  const [recSource, setRecSource] = useState<'camera' | 'screen'>('camera');
  const [chatInput, setChatInput] = useState('');
  const [speechRecError, setSpeechRecError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSessionActiveRef = useRef(false);

  useEffect(() => {
    loadCompanion(settings.activeCompanion).then(c => { if (c) setCompanion(c); });
  }, [settings.activeCompanion]);

  const companionName = companion?.name ?? DEFAULT_PERSONA.name;
  const companionRole = companion?.role ?? DEFAULT_PERSONA.role;
  const persona = companion ? {
    id: companion.id, name: companion.name, role: companion.role,
    description: companion.description ?? '', voiceName: (companion.voice.voiceId as 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr') ?? 'Kore',
    systemInstruction: companion.personality.systemPrompt,
  } : DEFAULT_PERSONA;

  const { connectionState: geminiState, error: geminiError, connect: connectGemini, disconnect: disconnectGemini, analysers, aiAudioStream } = useGeminiLive({ apiKey: effectiveApiKey, persona });
  const { connectionState: ollamaState, error: ollamaError, connect: connectOllama, disconnect: disconnectOllama, messages: chatMessages, sendMessage, isGenerating, currentResponse } = useOllamaChat({
    model: settings.llmModel, systemPrompt: companion?.personality.systemPrompt ?? DEFAULT_PERSONA.systemInstruction,
    onResponseComplete: useCallback((text: string) => { speak(text).catch(err => console.error('TTS error:', err)); }, []),
  });

  const connectionState = isOllamaMode ? ollamaState : geminiState;
  const providerError = isOllamaMode ? ollamaError : geminiError;
  const isAIConnected = connectionState === ConnectionState.CONNECTED;

  const { isRecording, formattedTime, startRecording, stopRecording } = useRecording({ canvasRef, aiAudioStream: isOllamaMode ? null : aiAudioStream });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, currentResponse]);

  const startSpeechRecognition = useCallback(() => {
    if (!isOllamaMode) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechRecError('Web Speech API not supported. Use Chrome or Edge.'); return; }
    setSpeechRecError(null);
    const rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    rec.onresult = (e: SpeechRecognitionEvent) => { const last = e.results[e.results.length - 1]; if (last.isFinal) { const t = last[0].transcript; if (t.trim() && aiEnabled) sendMessage(t); } };
    rec.onerror = (e: Event & { error?: string }) => { const et = e.error || 'unknown'; if (et === 'no-speech' || et === 'aborted') return; setSpeechRecError(`Speech error: ${et}`); };
    rec.onend = () => { if (isSessionActiveRef.current && recognitionRef.current) try { recognitionRef.current.start(); } catch { /* */ } };
    recognitionRef.current = rec; rec.start();
  }, [isOllamaMode, aiEnabled, sendMessage]);

  const stopSpeechRecognition = useCallback(() => { if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); recognitionRef.current = null; } }, []);
  const handleSilenceDetected = useCallback(() => { if (aiEnabled && isAIConnected) console.log('Silence detected'); }, [aiEnabled, isAIConnected]);
  const handleSpeechDetected = useCallback(() => { console.log('Speech detected'); }, []);
  const { isSpeaking, silenceProgress, startListening, stopListening, analyser: vadAnalyser } = useVoiceActivityDetection({ onSilenceDetected: handleSilenceDetected, onSpeechDetected: handleSpeechDetected, config: { silenceDuration: silenceThreshold } });

  const handleToggleSession = async () => {
    if (isSessionActive) {
      isSessionActiveRef.current = false; stopListening(); stopSpeechRecognition();
      if (isOllamaMode) disconnectOllama(); else disconnectGemini();
      setIsSessionActive(false); setMicError(null); setSpeechRecError(null);
      if (settings.autoTranscribe && chatMessages.length > 0) {
        const transcript = chatMessages.map(m => `${m.role === 'user' ? 'Host' : companionName}: ${m.content}`).join('\n\n');
        eventBus.emit(EVENTS.SESSION_TRANSCRIPT_READY, transcript);
        setSubTab('produce');
      }
    } else {
      setMicError(null); setSpeechRecError(null); setIsConnecting(true);
      try {
        await enumerateAudioDevices();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(t => t.stop());
        await startListening();
        if (aiEnabled) { if (isOllamaMode) { await connectOllama(); setTimeout(() => startSpeechRecognition(), 300); } else if (effectiveApiKey) connectGemini(); }
        setIsSessionActive(true); isSessionActiveRef.current = true; incrementStat('totalSessions');
      } catch (err) {
        if (err instanceof Error) { if (err.name === 'NotAllowedError') setMicError('Microphone access denied.'); else if (err.name === 'NotFoundError') setMicError('No microphone found.'); else setMicError(`Mic error: ${err.message}`); } else setMicError('Mic error: Unknown');
      } finally { setIsConnecting(false); }
    }
  };

  const handleToggleAI = () => {
    if (aiEnabled && isAIConnected) { if (isOllamaMode) { disconnectOllama(); stopSpeechRecognition(); } else disconnectGemini(); }
    else if (!aiEnabled && isSessionActive) { if (isOllamaMode) { connectOllama(); startSpeechRecognition(); } else connectGemini(); }
    setAiEnabled(!aiEnabled);
  };

  const handleSendChat = () => { if (chatInput.trim()) { sendMessage(chatInput); setChatInput(''); } };
  const error = providerError;

  // ─── PRODUCTION state ──────────────────────────────────────────
  const [pState, setPState] = useState<PipelineState>(pipeline.getState());
  const [transcript, setTranscript] = useState('');
  const [prodOllamaReady, setProdOllamaReady] = useState(false);
  const [prodModels, setProdModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:7b');

  useEffect(() => { const unsub = pipeline.subscribe(setPState); checkProdOllama(); return unsub; }, []);
  useEffect(() => { return eventBus.on<string>(EVENTS.SESSION_TRANSCRIPT_READY, (text) => { setTranscript(prev => prev ? `${prev}\n\n${text}` : text); }); }, []);
  useEffect(() => { pipeline.setModel(selectedModel); }, [selectedModel]);

  async function checkProdOllama() {
    const ok = await isOllamaAvailable(); setProdOllamaReady(ok);
    if (ok) { const m = await listModels(); setProdModels(m); if (m.length > 0 && !m.includes(selectedModel)) setSelectedModel(m[0]); }
  }
  async function runPipeline() { if (!transcript.trim()) return; try { await pipeline.produce(transcript); } catch { /* */ } }
  async function handleDownloadThumbnail() {
    const ep = pState.episode as Partial<EpisodePackage>;
    if (!ep.thumbnailFile) return;
    try { const res = await fetch(ep.thumbnailFile); const blob = await res.blob(); const slug = (ep.title || 'episode').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 60); await saveBlob('thumbnails', `${slug}_thumbnail.png`, blob); }
    catch { const a = document.createElement('a'); a.href = ep.thumbnailFile!; a.download = `${(ep.title || 'episode').replace(/\s+/g, '_')}_thumbnail.png`; a.click(); }
  }
  const isRunning = !['idle', 'complete', 'error'].includes(pState.stage);
  const episode = pState.episode as Partial<EpisodePackage>;

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sub-tab toggle */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-gray-900/40 px-4">
        <div className="flex gap-1">
          {(['record', 'produce'] as SubTab[]).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[1px] transition-all ${
                subTab === t ? 'text-cyan-300 border-cyan-500 bg-cyan-500/[0.06]' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >{t === 'record' ? 'Record' : 'Produce'}</button>
          ))}
        </div>
      </div>

      {/* ── RECORD sub-view ── */}
      <div className={subTab === 'record' ? 'flex-1 overflow-y-auto' : 'hidden'}>
        <div className="max-w-7xl mx-auto px-6 py-5">

          {/* ─── DASHBOARD (pre-session) ─── */}
          {!isSessionActive && !isConnecting && (
            <div className="space-y-6">
              {/* Hero */}
              <div className="text-center py-6">
                <div className="relative inline-block mb-4">
                  <Radio size={40} className="text-purple-400 breathe" />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-white">
                  Studio
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Record with {companionName}, your AI co-host
                </p>
              </div>

              {/* Start button (prominent) */}
              <button onClick={handleToggleSession} disabled={isConnecting}
                className="w-full max-w-md mx-auto block py-4 rounded-xl font-bold text-base bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 text-white hover:scale-[1.01] shadow-lg shadow-purple-500/15 shimmer transition-all">
                <Radio size={20} className="inline mr-2" /> Start Live Session
              </button>

              {/* Quick-start cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2">
                <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-4 space-y-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center"><Radio size={16} className="text-purple-400" /></div>
                  <h3 className="text-sm font-semibold text-slate-200">AI Conversation</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Speak naturally — {companionName} will listen and respond during pauses in your conversation.
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-4 space-y-2">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Video size={16} className="text-cyan-400" /></div>
                  <h3 className="text-sm font-semibold text-slate-200">Record Everything</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Capture video from your webcam or screen while the session records both voices.
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-4 space-y-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Wand2 size={16} className="text-amber-400" /></div>
                  <h3 className="text-sm font-semibold text-slate-200">Auto-Produce</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When you end the session, your transcript can flow straight into the Production pipeline.
                  </p>
                </div>
              </div>

              {/* Current setup summary */}
              <div className="max-w-md mx-auto bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Setup</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">AI Engine</span>
                  <span className="text-xs text-slate-200 font-medium">{isOllamaMode ? `Ollama (${settings.llmModel})` : 'Gemini Live'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Companion</span>
                  <span className="text-xs text-slate-200 font-medium">{companionName} — {companionRole}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Auto-transcribe</span>
                  <span className={`text-xs font-medium ${settings.autoTranscribe ? 'text-emerald-300' : 'text-slate-500'}`}>{settings.autoTranscribe ? 'On' : 'Off'}</span>
                </div>
              </div>

              {/* Error notices (still need to show these) */}
              {(error || micError) && (
                <div className="max-w-md mx-auto bg-red-900/15 border border-red-500/30 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-red-400 text-sm">{error || micError}</p>
                </div>
              )}
              {!isOllamaMode && !effectiveApiKey && (
                <div className="max-w-md mx-auto bg-yellow-900/15 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-yellow-400 text-sm">No Gemini API key. Go to Settings to configure, or switch to Ollama.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── LIVE SESSION UI (replaces dashboard once session starts) ─── */}
          {(isSessionActive || isConnecting) && <>

          {/* Header */}
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-white truncate">
                Live Recording
              </h1>
              <p className="text-gray-500 text-xs mt-1 truncate">
                {isOllamaMode ? `Session with ${companionName} (Ollama — ${settings.llmModel})` : `Session with ${companionName} (Gemini Live)`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {isRecording && (
                <span className="flex items-center gap-1.5 text-red-400 text-xs font-mono bg-red-900/20 px-3 py-1.5 rounded-full">
                  <Circle size={7} className="fill-red-500 animate-pulse" /> REC {formattedTime}
                </span>
              )}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono ${
                isSessionActive ? 'bg-green-900/30 border border-green-500/40' : 'bg-gray-800/60 border border-gray-700/60'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                {isSessionActive ? 'LIVE' : 'CONNECTING'}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Sidebar */}
            <div className="lg:col-span-3 space-y-4">
              {/* Participants */}
              <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Users size={14} /> Participants</h3>
                <div className={`flex items-center gap-3 p-2.5 rounded-lg bg-cyan-900/15 border border-cyan-500/20 mb-2 ${isSpeaking ? 'speaking-ring' : ''}`}>
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSpeaking ? 'ring-2 ring-cyan-400/50' : ''}`}>
                    {(settings.hostName || 'H').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-cyan-300 text-sm truncate">{settings.hostName || 'Host'}</p><p className="text-[11px] text-gray-500">Host</p></div>
                  {isSpeaking && <Volume2 size={14} className="text-cyan-400 animate-pulse flex-shrink-0" />}
                </div>
                <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${aiEnabled && isAIConnected ? 'bg-purple-900/15 border-purple-500/20 pulse-glow-purple' : 'bg-gray-800/40 border-gray-700/60'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${aiEnabled && isAIConnected ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600' : 'bg-gray-700'}`}>
                    {companionName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || <Cpu size={16} />}
                  </div>
                  <div className="flex-1 min-w-0"><p className={`font-semibold text-sm truncate ${aiEnabled ? 'text-purple-300' : 'text-gray-500'}`}>{companionName}</p><p className="text-[11px] text-gray-500 truncate">{companionRole}</p></div>
                  <button onClick={handleToggleAI} className={`p-1 rounded transition-colors flex-shrink-0 ${aiEnabled ? 'text-purple-400 hover:text-purple-300' : 'text-gray-600 hover:text-gray-400'}`} title={aiEnabled ? 'Mute AI' : 'Unmute AI'}>
                    {aiEnabled ? <Volume2 size={14} /> : <MicOff size={14} />}
                  </button>
                </div>
              </div>

              {/* AI Trigger */}
              <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><SettingsIcon size={14} /> AI Trigger</h3>
                <label className="text-[11px] text-gray-500 block mb-2">Silence: {silenceThreshold / 1000}s</label>
                <input type="range" min="1000" max="5000" step="500" value={silenceThreshold} onChange={(e) => setSilenceThreshold(Number(e.target.value))} className="w-full accent-cyan-500" disabled={isSessionActive} />
                {isSessionActive && !isSpeaking && (
                  <div className="mt-3">
                    <label className="text-[11px] text-gray-500 block mb-1">AI Activation</label>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all" style={{ width: `${silenceProgress * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Recording controls */}
              <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Video size={14} /> Recording</h3>
                <div className="space-y-1.5 mb-3">
                  <button onClick={() => setRecSource('camera')} disabled={isRecording} className={`w-full p-2 rounded-lg border flex items-center gap-2 text-xs transition-colors ${recSource === 'camera' ? 'bg-cyan-900/15 border-cyan-500/40 text-cyan-300' : 'bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600'} ${isRecording ? 'cursor-not-allowed opacity-50' : ''}`}><Camera size={13} /> Webcam</button>
                  <button onClick={() => setRecSource('screen')} disabled={isRecording} className={`w-full p-2 rounded-lg border flex items-center gap-2 text-xs transition-colors ${recSource === 'screen' ? 'bg-cyan-900/15 border-cyan-500/40 text-cyan-300' : 'bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600'} ${isRecording ? 'cursor-not-allowed opacity-50' : ''}`}><Monitor size={13} /> Screen</button>
                </div>
                <button onClick={() => isRecording ? stopRecording() : startRecording(recSource)} disabled={!isSessionActive} className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : isSessionActive ? 'bg-red-900/25 text-red-400 border border-red-500/40 hover:bg-red-900/40' : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'}`}>
                  {isRecording ? <><Square size={12} className="fill-white" /> Stop</> : <><Circle size={12} className="fill-red-500" /> Record</>}
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-4">
              {isOllamaMode ? (
                /* ── Ollama chat view ── */
                <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-5 relative min-h-[380px] flex flex-col">
                  <div className="mb-3 flex-shrink-0">
                    <div className="text-[11px] font-mono text-cyan-400/80 uppercase mb-2">Host Audio</div>
                    <div className="h-14"><AudioVisualizer analyser={vadAnalyser} isActive={isSessionActive && isSpeaking} color="#22d3ee" mode="cinematic" /></div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-3 flex-1 flex flex-col min-h-0">
                    <div className="text-[11px] font-mono text-purple-400/80 uppercase mb-2 flex items-center gap-2 flex-shrink-0"><MessageSquare size={11} /> {companionName} Chat</div>
                    <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-2 min-h-[180px]">
                      {chatMessages.length === 0 && !currentResponse && (
                        <p className="text-sm text-gray-500 italic text-center py-8">
                          {isAIConnected ? `Speak or type below to chat with ${companionName}` : `Start a session to chat with ${companionName}`}
                        </p>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-cyan-300' : 'text-purple-300'}`}>
                          <span className="text-[11px] text-gray-500 font-mono mr-2">{msg.role === 'user' ? 'You' : companionName}:</span>
                          <span className="text-slate-200">{msg.content}</span>
                        </div>
                      ))}
                      {currentResponse && (
                        <div className="text-sm text-purple-300">
                          <span className="text-[11px] text-gray-500 font-mono mr-2">{companionName}:</span>
                          <span className="text-slate-200">{currentResponse}</span><span className="animate-pulse">|</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder={isAIConnected ? 'Type a message...' : 'Start session first'} disabled={!isAIConnected || isGenerating}
                        className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 disabled:opacity-50" />
                      <button onClick={handleSendChat} disabled={!isAIConnected || !chatInput.trim() || isGenerating}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                  {!isSessionActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                      <div className="text-center">
                        <div className="relative inline-block mb-4"><Radio size={40} className="text-purple-400 breathe" /><div className="absolute inset-0 rounded-full pulse-glow-purple" /></div>
                        <p className="text-base font-semibold text-slate-200">Session with {companionName}</p>
                        <p className="text-xs text-slate-500 mt-1">Press Start Live Session to begin</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Gemini dual-waveform view ── */
                <div className="bg-gray-900/40 rounded-xl border border-white/[0.06] p-5 relative min-h-[280px]">
                  <div className="space-y-5">
                    <div><div className="text-[11px] font-mono text-cyan-400/80 uppercase mb-2">Host Audio</div><div className="h-28"><AudioVisualizer analyser={vadAnalyser} isActive={isSessionActive && isSpeaking} color="#22d3ee" mode="cinematic" /></div></div>
                    <div><div className="text-[11px] font-mono text-purple-400/80 uppercase mb-2">{companionName}</div><div className="h-20 opacity-80"><AudioVisualizer analyser={analysers?.output || null} isActive={isAIConnected} color="#c084fc" mode="cinematic" /></div></div>
                  </div>
                  {!isSessionActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                      <div className="text-center">
                        <div className="relative inline-block mb-4"><Radio size={40} className="text-purple-400 breathe" /><div className="absolute inset-0 rounded-full pulse-glow-purple" /></div>
                        <p className="text-base font-semibold text-slate-200">Session with {companionName}</p>
                        <p className="text-xs text-slate-500 mt-1">Press Start Live Session to begin</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Session button */}
              <button onClick={handleToggleSession} disabled={isConnecting}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
                  isConnecting
                    ? 'bg-gray-800/60 text-gray-400 border border-gray-700/60 cursor-wait'
                    : isSessionActive
                      ? 'bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/90 hover:text-white'
                      : 'bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 text-white hover:scale-[1.01] shadow-lg shadow-purple-500/15 shimmer'
                }`}
              >
                {isConnecting ? <><Loader2 size={20} className="animate-spin" /> Connecting...</> : isSessionActive ? <><MicOff size={20} /> End Session</> : <><Radio size={20} /> Start Live Session</>}
              </button>

              {/* Error / warning notices */}
              {(error || micError || speechRecError) && (
                <div className="bg-red-900/15 border border-red-500/30 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-red-400 text-sm">{error || micError || speechRecError}</p>
                </div>
              )}
              {!isOllamaMode && !effectiveApiKey && (
                <div className="bg-yellow-900/15 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-yellow-400 text-sm">No Gemini API key. Go to Settings to configure, or switch to Ollama.</p>
                </div>
              )}
              {isOllamaMode && connectionState === ConnectionState.ERROR && (
                <div className="bg-yellow-900/15 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-yellow-400 text-sm">Make sure Ollama is running: <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">ollama serve</code></p>
                </div>
              )}
            </div>
          </div>

          </>}
        </div>
        <canvas ref={canvasRef} className="hidden" width={1920} height={1080} />
      </div>

      {/* ── PRODUCE sub-view ── */}
      <div className={subTab === 'produce' ? 'flex-1 overflow-y-auto' : 'hidden'}>
        <div className="max-w-4xl mx-auto px-6 py-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Production</h2>
              <p className="text-xs text-slate-400 mt-1">AI-powered post-production pipeline</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${prodOllamaReady ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-xs text-slate-400">{prodOllamaReady ? `Ollama (${selectedModel})` : 'Ollama offline'}</span>
            </div>
          </div>

          {prodModels.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Model:</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500/40" disabled={isRunning}>
                {prodModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {/* Transcript input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Episode Transcript</label>
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your episode transcript here, or record in the Record tab and it will appear automatically..."
              className="w-full h-44 bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 text-sm text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:border-purple-500/40" disabled={isRunning} />
            <div className="text-[11px] text-slate-500">{transcript.length > 0 ? `${transcript.split(/\s+/).length} words` : 'No transcript loaded'}</div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button onClick={runPipeline} disabled={!prodOllamaReady || !transcript.trim() || isRunning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${pState.stage === 'complete' ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:opacity-90' : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:opacity-90'}`}>
              {isRunning ? <><Loader2 size={16} className="animate-spin" /> Producing...</> : pState.stage === 'complete' ? <><CheckCircle size={16} /> Complete</> : <><Wand2 size={16} /> Produce Episode</>}
            </button>
            {pState.stage === 'complete' && (
              <button onClick={() => pipeline.reset()} className="flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition-colors text-sm">
                <RotateCcw size={14} /> New Episode
              </button>
            )}
          </div>

          {/* Pipeline progress */}
          {pState.stage !== 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between overflow-x-auto py-2">
                {PIPELINE_STEPS.map((step, i) => {
                  const status = getStepStatus(step.stage, pState.stage);
                  const Icon = step.icon;
                  return (
                    <div key={step.stage} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center min-w-[44px]">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${status === 'completed' ? 'bg-gradient-to-br from-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/15' : status === 'active' ? 'border-2 border-cyan-400 text-cyan-400 pulse-glow' : 'border-2 border-gray-700/60 text-gray-600'}`}>
                          {status === 'completed' ? <Check size={14} /> : status === 'active' ? <Loader2 size={14} className="animate-spin" /> : <Icon size={12} />}
                        </div>
                        <span className={`text-[10px] mt-1 text-center whitespace-nowrap ${status === 'completed' ? 'text-cyan-400' : status === 'active' ? 'text-white font-medium' : 'text-gray-600'}`}>{step.label}</span>
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded transition-all ${status === 'completed' ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-gray-800 border-t border-dashed border-gray-700/60'}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-slate-300">{STAGE_LABELS[pState.stage] ?? pState.stage}</span><span className="text-slate-500">{pState.progress}%</span></div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${pState.stage === 'error' ? 'bg-red-500' : pState.stage === 'complete' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`} style={{ width: `${pState.progress}%` }} /></div>
                {pState.error && <p className="text-xs text-red-400">{pState.error}</p>}
              </div>
            </div>
          )}

          {/* Episode results */}
          {(episode.title || episode.description || episode.showNotes || episode.socialPosts) && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/15 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-1.5"><Play size={18} className="text-purple-400" /><h3 className="text-base font-bold text-white">Episode Package</h3>{pState.stage === 'complete' && <span className="ml-auto px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/25 rounded-full text-[11px] text-emerald-400 font-medium">Complete</span>}</div>
                {episode.title && <p className="text-slate-300 text-sm">{episode.title}</p>}
              </div>
              {episode.title && <CollapsibleSection title="Episode Title" defaultOpen accentColor="border-l-cyan-500"><div className="flex items-start justify-between gap-2 pt-3"><h4 className="text-lg font-bold text-white">{episode.title}</h4><CopyButton text={episode.title} /></div></CollapsibleSection>}
              {episode.description && <CollapsibleSection title="Description" defaultOpen accentColor="border-l-purple-500"><div className="pt-3 space-y-2"><div className="flex justify-end"><CopyButton text={episode.description} /></div><p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{episode.description}</p></div></CollapsibleSection>}
              {episode.showNotes && <CollapsibleSection title="Show Notes" accentColor="border-l-amber-500"><div className="pt-3 space-y-2"><div className="flex justify-end"><CopyButton text={episode.showNotes} /></div><div className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{episode.showNotes}</div></div></CollapsibleSection>}
              {episode.thumbnailFile && <CollapsibleSection title="Episode Thumbnail" defaultOpen accentColor="border-l-emerald-500"><div className="pt-3 space-y-3"><div className="relative group w-full max-w-lg rounded-xl overflow-hidden border border-white/[0.08] shadow-lg"><img src={episode.thumbnailFile} alt="Episode thumbnail" className="w-full transition-transform duration-300 group-hover:scale-105" /><div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[10px] text-slate-300 font-mono">1280 x 720</div></div><div className="flex gap-2"><button onClick={handleDownloadThumbnail} className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] transition-colors text-sm text-slate-300"><Download size={14} /> Save Thumbnail</button></div></div></CollapsibleSection>}
              {episode.socialPosts && <CollapsibleSection title="Social Media Posts" accentColor="border-l-pink-500"><div className="pt-3 space-y-4"><div><div className="flex items-center justify-between mb-2"><span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider">Twitter / X</span><CopyButton text={episode.socialPosts.twitter} /></div><p className="text-sm text-slate-300 bg-white/[0.03] rounded-lg p-3">{episode.socialPosts.twitter}</p><span className="text-[11px] text-slate-500">{episode.socialPosts.twitter.length}/280</span></div><div><div className="flex items-center justify-between mb-2"><span className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">Long Form</span><CopyButton text={episode.socialPosts.long} /></div><p className="text-sm text-slate-300 bg-white/[0.03] rounded-lg p-3 whitespace-pre-wrap">{episode.socialPosts.long}</p></div></div></CollapsibleSection>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
