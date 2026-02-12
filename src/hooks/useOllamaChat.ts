/**
 * Ollama Chat Hook - Text-based AI chat for Studio tab
 * Provides similar interface to useGeminiLive but uses Ollama for text chat.
 * When the user speaks, their transcribed text is sent to Ollama for a response.
 */

import { useState, useRef, useCallback } from 'react';
import { ConnectionState } from '../types';
import { isOllamaAvailable, chatStream } from '../services/ollama';
import type { OllamaMessage } from '../services/ollama';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UseOllamaChatProps {
  model: string;
  systemPrompt: string;
}

export function useOllamaChat({ model, systemPrompt }: UseOllamaChatProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<OllamaMessage[]>([]);

  const connect = useCallback(async () => {
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    const available = await isOllamaAvailable();
    if (!available) {
      setError('Ollama is not running. Start with: ollama serve');
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    // Initialize conversation with system prompt
    historyRef.current = [{ role: 'system', content: systemPrompt }];
    setMessages([]);
    setConnectionState(ConnectionState.CONNECTED);
  }, [systemPrompt]);

  const disconnect = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    historyRef.current = [];
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsGenerating(false);
    setCurrentResponse('');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || connectionState !== ConnectionState.CONNECTED) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    historyRef.current.push({ role: 'user', content: text.trim() });

    setIsGenerating(true);
    setCurrentResponse('');

    try {
      let fullResponse = '';
      for await (const chunk of chatStream(model, historyRef.current)) {
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: fullResponse, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
      historyRef.current.push({ role: 'assistant', content: fullResponse });
      setCurrentResponse('');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Ollama chat error';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [model, connectionState]);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    messages,
    sendMessage,
    isGenerating,
    currentResponse,
  };
}
