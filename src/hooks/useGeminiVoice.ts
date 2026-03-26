/**
 * useGeminiVoice — React hook for Gemini Live voice conversation
 *
 * Manages the full co-host loop:
 *   Mic audio → Gemini Live → AI voice response → both recorded
 *
 * This is the engine. Everything else is UI.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  connectGeminiLive,
  disconnectGeminiLive,
  sendAudio,
  sendText,
  isGeminiConnected,
  type GeminiLiveConfig,
} from '../services/geminiLive';
import { getSettings } from './useSettings';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UseGeminiVoiceReturn {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  messages: ChatMessage[];
  currentResponse: string;
  error: string | null;
  startSession: () => Promise<void>;
  stopSession: () => void;
  sendChatMessage: (text: string) => void;
  audioDestination: MediaStreamAudioDestinationNode | null;
}

export function useGeminiVoice(): UseGeminiVoiceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Audio capture from mic → send to Gemini
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // ─── Start Session ──────────────────────────────────────
  const startSession = useCallback(async () => {
    const settings = getSettings();
    const apiKey = settings.geminiApiKey;

    if (!apiKey) {
      setError('No API key configured. Go to Settings to add your Gemini key.');
      return;
    }

    setError(null);

    try {
      // Connect to Gemini Live
      await connectGeminiLive(
        {
          apiKey,
          systemInstruction: settings.coHostPersonality || undefined,
        },
        {
          onConnected: () => {
            setIsConnected(true);
            setError(null);
          },
          onAudioResponse: (_audioData) => {
            setIsSpeaking(true);
            // Audio playback is handled inside geminiLive.ts
          },
          onTextResponse: (text) => {
            setCurrentResponse(prev => prev + text);
          },
          onTurnComplete: () => {
            setIsSpeaking(false);
            // Save the completed response as a message
            setCurrentResponse(prev => {
              if (prev.trim()) {
                setMessages(msgs => [...msgs, {
                  role: 'assistant',
                  content: prev.trim(),
                  timestamp: Date.now(),
                }]);
              }
              return '';
            });
          },
          onError: (err) => {
            setError(err);
            console.error('[GeminiVoice] Error:', err);
          },
          onDisconnected: () => {
            setIsConnected(false);
          },
        }
      );

      // Start mic capture and stream to Gemini
      await startMicCapture();

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setError(msg);
    }
  }, []);

  // ─── Mic Capture → Gemini ─────────────────────────────────
  const startMicCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      // Create audio context at 16kHz for Gemini
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      // Create a destination for recording capture
      destinationRef.current = ctx.createMediaStreamDestination();

      const source = ctx.createMediaStreamSource(stream);

      // Use ScriptProcessor to get raw PCM data to send to Gemini
      // (AudioWorklet would be better but ScriptProcessor works everywhere)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isGeminiConnected()) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32768)));
        }
        sendAudio(pcm16.buffer);
      };

      source.connect(processor);
      processor.connect(ctx.destination); // Required for ScriptProcessor to work
      source.connect(destinationRef.current); // For recording capture

      setIsListening(true);
    } catch (err) {
      setError('Could not access microphone. Please allow mic access and try again.');
    }
  }, []);

  // ─── Stop Session ─────────────────────────────────────────
  const stopSession = useCallback(() => {
    // Stop mic
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Disconnect Gemini
    disconnectGeminiLive();

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentResponse('');
  }, []);

  // ─── Text Chat (typed input) ──────────────────────────────
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    // Add user message to transcript
    setMessages(prev => [...prev, {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }]);

    // Send to Gemini
    sendText(text.trim());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopSession(); };
  }, [stopSession]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    messages,
    currentResponse,
    error,
    startSession,
    stopSession,
    sendChatMessage,
    audioDestination: destinationRef.current,
  };
}
