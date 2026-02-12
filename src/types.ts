// Core AI Persona/Companion Types
export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  systemInstruction: string;
}

// Extended Companion Configuration (from companions/*.json)
export interface CompanionConfig {
  id: string;
  name: string;
  role: string;
  version: string;
  description?: string;
  avatar?: string;
  voice: {
    provider: 'gemini' | 'coqui' | 'edge_tts' | 'piper';
    voiceId: string;
    pitch?: number;
    speed?: number;
  };
  llm: {
    provider: 'gemini' | 'anthropic' | 'ollama' | 'gpt4all' | 'lmstudio';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  personality: {
    systemPrompt: string;
    traits: string[];
    conversationStyle: 'formal' | 'casual' | 'friendly' | 'professional' | 'playful';
    responseLength: 'brief' | 'moderate' | 'detailed';
    interruptionBehavior: 'passive' | 'balanced' | 'active';
  };
  memory?: {
    enabled: boolean;
    vaultPath: string;
    contextWindow: number;
  };
  capabilities?: {
    podcast: boolean;
    transcription: boolean;
    writing: boolean;
    research: boolean;
  };
}

// LLM Provider Types
export interface LLMProvider {
  name: string;
  type: 'local' | 'remote';
  enabled: boolean;
  defaultEndpoint?: string;
  requiresApiKey?: boolean;
  apiKeyEnvVar?: string;
  models: LLMModel[];
}

export interface LLMModel {
  id: string;
  name: string;
  contextWindow: number;
  recommended: boolean;
  features?: string[];
}

// TTS Provider Types
export interface TTSProvider {
  name: string;
  type: 'local' | 'remote' | 'hybrid';
  enabled: boolean;
  defaultEndpoint?: string;
  requiresInternet?: boolean;
  requiresApiKey?: boolean;
  voices: TTSVoice[];
}

export interface TTSVoice {
  id: string;
  name: string;
  language?: string;
  quality?: 'low' | 'medium' | 'high';
  description?: string;
}

// STT Provider Types
export interface STTProvider {
  name: string;
  type: 'local' | 'remote' | 'browser';
  enabled: boolean;
  defaultEndpoint?: string;
  requiresInternet?: boolean;
  models?: STTModel[];
}

export interface STTModel {
  id: string;
  name: string;
  size: string;
  quality: string;
  speed: string;
  recommended: boolean;
}

// Audio Visualizer
export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color: string;
  mode?: 'default' | 'cinematic';
}

// Connection State
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];

// Settings Types
export interface AIProviderSettings {
  llm: {
    provider: string;
    model: string;
    endpoint?: string;
  };
  tts: {
    provider: string;
    voice: string;
    endpoint?: string;
  };
  stt: {
    provider: string;
    model: string;
    endpoint?: string;
  };
}

export interface BackupSettings {
  enabled: boolean;
  schedule: {
    daily: boolean;
    weekly: boolean;
  };
  destinations: BackupDestination[];
}

export interface BackupDestination {
  id: string;
  type: 'local' | 'network' | 'syncthing';
  enabled: boolean;
  path: string;
}

