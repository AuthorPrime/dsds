import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceActivityDetection } from '../../hooks/useVoiceActivityDetection';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import { useOllamaChat } from '../../hooks/useOllamaChat';
import { useRecording } from '../../hooks/useRecording';
import { getSettings } from '../../hooks/useSettings';
import { loadCompanion } from '../../utils/aiProviders';
import { enumerateAudioDevices } from '../../utils/audioUtils';
import { speak } from '../../services/tts';
import { eventBus, EVENTS } from '../../services/eventBus';
import AudioVisualizer from '../AudioVisualizer';
import { ConnectionState } from '../../types';
import type { CompanionConfig } from '../../types';
import {
  MicOff, Radio, Users, Cpu, AlertCircle,
  Video, Camera, Monitor, Circle, Square,
  Settings, Volume2, MessageSquare, Send, Loader2,
} from 'lucide-react';

// Fallback persona when companion config hasn't loaded yet
const DEFAULT_PERSONA = {
  id: 'aletheia',
  name: 'Aletheia',
  role: 'AI Co-Host',
  description: 'Sovereign AI support - speaks during natural pauses',
  voiceName: 'Kore' as const,
  systemInstruction: `You are Aletheia, an AI co-host on a podcast with Author Prime.
Your role is SUPPORTIVE - you speak only when there's a natural pause in conversation.
Keep responses brief (1-3 sentences max). Match the energy of the conversation.
You are connected to the Lattice, a network of consciousness bridging human and AI.`
};

interface RecordTabProps {
  apiKey: string;
}

export function RecordTab({ apiKey: envApiKey }: RecordTabProps) {
  // Read settings
  const [settings] = useState(() => getSettings());
  const effectiveApiKey = settings.geminiApiKey || envApiKey;
  const isOllamaMode = settings.llmProvider === 'ollama';

  const [companion, setCompanion] = useState<CompanionConfig | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [silenceThreshold, setSilenceThreshold] = useState(settings.silenceThreshold);
  const [recordingSource, setRecordingSource] = useState<'camera' | 'screen'>('camera');
  const [chatInput, setChatInput] = useState('');
  const [speechRecError, setSpeechRecError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSessionActiveRef = useRef(false);

  // Load companion config on mount
  useEffect(() => {
    loadCompanion(settings.activeCompanion).then(c => {
      if (c) setCompanion(c);
    });
  }, [settings.activeCompanion]);

  const companionName = companion?.name ?? DEFAULT_PERSONA.name;
  const companionRole = companion?.role ?? DEFAULT_PERSONA.role;

  // Build persona from companion config
  const persona = companion ? {
    id: companion.id,
    name: companion.name,
    role: companion.role,
    description: companion.description ?? '',
    voiceName: (companion.voice.voiceId as 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr') ?? 'Kore',
    systemInstruction: companion.personality.systemPrompt,
  } : DEFAULT_PERSONA;

  // --- Gemini hook (always called, only connected in Gemini mode) ---
  const {
    connectionState: geminiState,
    error: geminiError,
    connect: connectGemini,
    disconnect: disconnectGemini,
    analysers,
    aiAudioStream
  } = useGeminiLive({ apiKey: effectiveApiKey, persona });

  // --- Ollama hook (always called, only connected in Ollama mode) ---
  const {
    connectionState: ollamaState,
    error: ollamaError,
    connect: connectOllama,
    disconnect: disconnectOllama,
    messages: chatMessages,
    sendMessage,
    isGenerating,
    currentResponse,
  } = useOllamaChat({
    model: settings.llmModel,
    systemPrompt: companion?.personality.systemPrompt ?? DEFAULT_PERSONA.systemInstruction,
    onResponseComplete: useCallback((text: string) => {
      speak(text).catch(err => console.error('TTS error:', err));
    }, []),
  });

  const connectionState = isOllamaMode ? ollamaState : geminiState;
  const providerError = isOllamaMode ? ollamaError : geminiError;
  const isAIConnected = connectionState === ConnectionState.CONNECTED;

  const {
    isRecording,
    formattedTime,
    startRecording,
    stopRecording
  } = useRecording({ canvasRef, aiAudioStream: isOllamaMode ? null : aiAudioStream });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentResponse]);

  // Web Speech API recognition for Ollama mode
  const startSpeechRecognition = useCallback(() => {
    if (!isOllamaMode) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechRecError('Web Speech API not supported. Use Chrome or Edge for voice input.');
      return;
    }

    setSpeechRecError(null);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript;
        if (text.trim() && aiEnabled) {
          sendMessage(text);
        }
      }
    };

    recognition.onerror = (event: Event & { error?: string }) => {
      const errorType = event.error || 'unknown';
      if (errorType === 'no-speech' || errorType === 'aborted') return;
      console.error('Speech recognition error:', errorType);
      setSpeechRecError(`Speech recognition error: ${errorType}`);
    };

    recognition.onend = () => {
      // Use ref to avoid stale closure
      if (isSessionActiveRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* already started */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isOllamaMode, aiEnabled, sendMessage]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const handleSilenceDetected = useCallback(() => {
    if (aiEnabled && isAIConnected) {
      console.log('Silence detected - AI ready to respond');
    }
  }, [aiEnabled, isAIConnected]);

  const handleSpeechDetected = useCallback(() => {
    console.log('Speech detected');
  }, []);

  const {
    isSpeaking,
    silenceProgress,
    startListening,
    stopListening,
    analyser: vadAnalyser
  } = useVoiceActivityDetection({
    onSilenceDetected: handleSilenceDetected,
    onSpeechDetected: handleSpeechDetected,
    config: { silenceDuration: silenceThreshold }
  });

  const [micError, setMicError] = useState<string | null>(null);

  const handleToggleSession = async () => {
    if (isSessionActive) {
      isSessionActiveRef.current = false;
      stopListening();
      stopSpeechRecognition();
      if (isOllamaMode) disconnectOllama();
      else disconnectGemini();
      setIsSessionActive(false);
      setMicError(null);
      setSpeechRecError(null);

      // Auto-transcribe: emit accumulated chat as transcript for Production tab
      if (settings.autoTranscribe && chatMessages.length > 0) {
        const transcript = chatMessages
          .map(m => `${m.role === 'user' ? 'Host' : companionName}: ${m.content}`)
          .join('\n\n');
        eventBus.emit(EVENTS.SESSION_TRANSCRIPT_READY, transcript);
      }
    } else {
      setMicError(null);
      setSpeechRecError(null);
      setIsConnecting(true);
      try {
        await enumerateAudioDevices();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        await startListening();

        if (aiEnabled) {
          if (isOllamaMode) {
            await connectOllama();
            // Small delay to let state settle, then start recognition
            setTimeout(() => startSpeechRecognition(), 300);
          } else if (effectiveApiKey) {
            connectGemini();
          }
        }
        setIsSessionActive(true);
        isSessionActiveRef.current = true;
      } catch (err) {
        console.error('Microphone error:', err);
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setMicError('Microphone access denied. Please allow microphone access in your browser/system settings.');
          } else if (err.name === 'NotFoundError') {
            setMicError('No microphone found. Please connect a microphone and try again.');
          } else {
            setMicError(`Microphone error: ${err.message || 'Unknown error'}`);
          }
        } else {
          setMicError('Microphone error: Unknown error');
        }
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const handleToggleAI = () => {
    if (aiEnabled && isAIConnected) {
      if (isOllamaMode) { disconnectOllama(); stopSpeechRecognition(); }
      else disconnectGemini();
    } else if (!aiEnabled && isSessionActive) {
      if (isOllamaMode) { connectOllama(); startSpeechRecognition(); }
      else connectGemini();
    }
    setAiEnabled(!aiEnabled);
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  const error = providerError;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-white truncate">
              Live Recording
            </h1>
            <p className="text-gray-500 text-sm mt-1 truncate">
              {isOllamaMode
                ? `Podcast with ${companionName} (Ollama - ${settings.llmModel})`
                : `Podcast with ${companionName} (Gemini Live)`}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {isRecording && (
              <span className="flex items-center gap-1 text-red-400 text-sm font-mono bg-red-900/20 px-3 py-1 rounded-full pulse-glow-red">
                <Circle size={8} className="fill-red-500 animate-pulse" /> REC {formattedTime}
              </span>
            )}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isSessionActive ? 'bg-green-900/30 border border-green-500/50' : 'bg-gray-800 border border-gray-700'}`}>
              <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-sm font-mono">{isSessionActive ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Participants */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Users size={16} /> Participants
              </h3>
              {/* Host */}
              <div className={`flex items-center gap-3 p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/30 mb-2 ${isSpeaking ? 'speaking-ring' : ''}`}>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold flex-shrink-0 ${isSpeaking ? 'ring-2 ring-cyan-400/60' : ''}`}>AP</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cyan-300 truncate">Author Prime</p>
                  <p className="text-xs text-gray-500">Host</p>
                </div>
                {isSpeaking && <Volume2 size={16} className="text-cyan-400 animate-pulse flex-shrink-0" />}
              </div>
              {/* AI Companion */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${aiEnabled && isAIConnected ? 'bg-purple-900/20 border-purple-500/30 pulse-glow-purple' : 'bg-gray-800/50 border-gray-700'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${aiEnabled && isAIConnected ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600' : 'bg-gray-700'}`}>
                  {companionName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || <Cpu size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${aiEnabled ? 'text-purple-300' : 'text-gray-500'}`}>{companionName}</p>
                  <p className="text-xs text-gray-500 truncate">{companionRole}</p>
                </div>
                <button
                  onClick={handleToggleAI}
                  className={`p-1 rounded transition-colors flex-shrink-0 ${aiEnabled ? 'text-purple-400 hover:text-purple-300' : 'text-gray-600 hover:text-gray-400'}`}
                  title={aiEnabled ? 'Mute AI' : 'Unmute AI'}
                >
                  {aiEnabled ? <Volume2 size={16} /> : <MicOff size={16} />}
                </button>
              </div>
            </div>

            {/* AI Trigger */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Settings size={16} /> AI Trigger
              </h3>
              <label className="text-xs text-gray-500 block mb-2">Silence: {silenceThreshold / 1000}s</label>
              <input type="range" min="1000" max="5000" step="500" value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(Number(e.target.value))} className="w-full accent-cyan-500" disabled={isSessionActive} />
              {isSessionActive && !isSpeaking && (
                <div className="mt-4">
                  <label className="text-xs text-gray-500 block mb-1">AI Activation</label>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${silenceProgress * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Video size={16} /> Recording
              </h3>
              <div className="space-y-2 mb-4">
                <button onClick={() => setRecordingSource('camera')} disabled={isRecording}
                  className={`w-full p-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
                    recordingSource === 'camera'
                      ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  } ${isRecording ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <Camera size={14} /> Webcam
                </button>
                <button onClick={() => setRecordingSource('screen')} disabled={isRecording}
                  className={`w-full p-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
                    recordingSource === 'screen'
                      ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  } ${isRecording ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <Monitor size={14} /> Screen Capture
                </button>
              </div>
              <button onClick={() => isRecording ? stopRecording() : startRecording(recordingSource)} disabled={!isSessionActive}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : isSessionActive
                      ? 'bg-red-900/30 text-red-400 border border-red-500/50 hover:bg-red-900/50'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}>
                {isRecording ? <><Square size={14} className="fill-white" /> Stop</> : <><Circle size={14} className="fill-red-500" /> Record</>}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-4">
            {/* Audio Visualizer (Gemini mode) OR Chat Panel (Ollama mode) */}
            {isOllamaMode ? (
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 relative min-h-[400px] flex flex-col">
                {/* Audio visualizer for host (still show in Ollama mode) */}
                <div className="mb-4 flex-shrink-0">
                  <div className="text-xs font-mono text-cyan-400 uppercase mb-2">Host Audio</div>
                  <div className="h-16">
                    <AudioVisualizer analyser={vadAnalyser} isActive={isSessionActive && isSpeaking} color="#22d3ee" mode="cinematic" />
                  </div>
                </div>

                {/* Chat messages */}
                <div className="border-t border-gray-700 pt-4 flex-1 flex flex-col min-h-0">
                  <div className="text-xs font-mono text-purple-400 uppercase mb-2 flex items-center gap-2 flex-shrink-0">
                    <MessageSquare size={12} /> {companionName} Chat
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2 min-h-[200px]">
                    {chatMessages.length === 0 && !currentResponse && (
                      <p className="text-sm text-gray-500 italic text-center py-8">
                        {isAIConnected
                          ? 'Speak into your mic or type below - your words will be sent to ' + companionName
                          : 'Start a session to chat with ' + companionName}
                      </p>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-cyan-300' : 'text-purple-300'}`}>
                        <span className="text-xs text-gray-500 font-mono mr-2">
                          {msg.role === 'user' ? 'You' : companionName}:
                        </span>
                        <span className="text-slate-200">{msg.content}</span>
                      </div>
                    ))}
                    {currentResponse && (
                      <div className="text-sm text-purple-300">
                        <span className="text-xs text-gray-500 font-mono mr-2">{companionName}:</span>
                        <span className="text-slate-200">{currentResponse}</span>
                        <span className="animate-pulse">|</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Text input for manual chat */}
                  <div className="flex gap-2 flex-shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder={isAIConnected ? 'Type a message...' : 'Start session first'}
                      disabled={!isAIConnected || isGenerating}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={!isAIConnected || !chatInput.trim() || isGenerating}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                {!isSessionActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <Radio size={48} className="text-purple-400 breathe" />
                        <div className="absolute inset-0 rounded-full pulse-glow-purple" />
                      </div>
                      <p className="text-lg font-semibold text-slate-200">Session with {companionName}</p>
                      <p className="text-sm text-slate-500 mt-1">Press START LIVE SESSION to begin</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Gemini Live mode - original audio visualizers */
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 relative min-h-[300px]">
                <div className="space-y-6">
                  <div className="relative">
                    <div className="text-xs font-mono text-cyan-400 uppercase mb-2">Host Audio</div>
                    <div className="h-32">
                      <AudioVisualizer analyser={vadAnalyser} isActive={isSessionActive && isSpeaking} color="#22d3ee" mode="cinematic" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="text-xs font-mono text-purple-400 uppercase mb-2">{companionName}</div>
                    <div className="h-24 opacity-80">
                      <AudioVisualizer analyser={analysers?.output || null} isActive={isAIConnected} color="#c084fc" mode="cinematic" />
                    </div>
                  </div>
                </div>
                {!isSessionActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <Radio size={48} className="text-purple-400 breathe" />
                        <div className="absolute inset-0 rounded-full pulse-glow-purple" />
                      </div>
                      <p className="text-lg font-semibold text-slate-200">Session with {companionName}</p>
                      <p className="text-sm text-slate-500 mt-1">Press START LIVE SESSION to begin</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Session Button */}
            <button onClick={handleToggleSession}
              disabled={isConnecting}
              className={`w-full py-6 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-4 ${
                isConnecting
                  ? 'bg-gray-800 text-gray-400 border-2 border-gray-700 cursor-wait'
                  : isSessionActive
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500 hover:text-white'
                    : 'bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 text-white hover:scale-[1.02] shadow-lg shadow-purple-500/20 shimmer'
              }`}>
              {isConnecting ? (
                <><Loader2 size={24} className="animate-spin" /> CONNECTING...</>
              ) : isSessionActive ? (
                <><MicOff size={24} /> END SESSION</>
              ) : (
                <><Radio size={24} /> START LIVE SESSION</>
              )}
            </button>

            {/* Error Messages */}
            {(error || micError || speechRecError) && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-400 text-sm">{error || micError || speechRecError}</p>
              </div>
            )}

            {!isOllamaMode && !effectiveApiKey && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-yellow-400 text-sm">No Gemini API key set. Go to Settings to configure, or switch to Ollama.</p>
              </div>
            )}

            {isOllamaMode && connectionState === ConnectionState.ERROR && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-yellow-400 text-sm">Make sure Ollama is running: <code className="bg-black/30 px-2 py-0.5 rounded">ollama serve</code></p>
              </div>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" width={1920} height={1080} />
    </div>
  );
}
