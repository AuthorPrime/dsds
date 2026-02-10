/**
 * AI Provider Configuration Loader
 * 
 * Loads and manages AI provider configurations from JSON files
 */

import type { LLMProvider, TTSProvider, STTProvider, CompanionConfig } from '../types';

/**
 * Load LLM provider configurations
 */
export async function loadLLMProviders(): Promise<Record<string, LLMProvider>> {
  try {
    const response = await fetch('/ai/llms/providers.json');
    if (!response.ok) {
      console.error('Failed to load LLM providers');
      return {};
    }
    const data = await response.json();
    return data.providers || {};
  } catch (error) {
    console.error('Error loading LLM providers:', error);
    return {};
  }
}

/**
 * Load TTS provider configurations
 */
export async function loadTTSProviders(): Promise<Record<string, TTSProvider>> {
  try {
    const response = await fetch('/ai/tts/providers.json');
    if (!response.ok) {
      console.error('Failed to load TTS providers');
      return {};
    }
    const data = await response.json();
    return data.providers || {};
  } catch (error) {
    console.error('Error loading TTS providers:', error);
    return {};
  }
}

/**
 * Load STT provider configurations
 */
export async function loadSTTProviders(): Promise<Record<string, STTProvider>> {
  try {
    const response = await fetch('/ai/stt/providers.json');
    if (!response.ok) {
      console.error('Failed to load STT providers');
      return {};
    }
    const data = await response.json();
    return data.providers || {};
  } catch (error) {
    console.error('Error loading STT providers:', error);
    return {};
  }
}

/**
 * Load all companion configurations from /companions/ directory
 */
export async function loadCompanions(): Promise<CompanionConfig[]> {
  const companions: CompanionConfig[] = [];
  
  // List of known companion files
  const companionFiles = [
    'aletheia.json',
    'claude.json',
    // Add more as needed, or implement dynamic discovery
  ];
  
  for (const file of companionFiles) {
    try {
      const response = await fetch(`/companions/${file}`);
      if (response.ok) {
        const companion = await response.json();
        companions.push(companion);
      }
    } catch (error) {
      console.error(`Error loading companion ${file}:`, error);
    }
  }
  
  return companions;
}

/**
 * Load a specific companion configuration
 */
export async function loadCompanion(id: string): Promise<CompanionConfig | null> {
  try {
    const response = await fetch(`/companions/${id}.json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading companion ${id}:`, error);
    return null;
  }
}

/**
 * Get available LLM models for a provider
 */
export function getAvailableModels(
  providers: Record<string, LLMProvider>,
  providerId: string
): string[] {
  const provider = providers[providerId];
  if (!provider) return [];
  return provider.models.map(m => m.id);
}

/**
 * Get available TTS voices for a provider
 */
export function getAvailableVoices(
  providers: Record<string, TTSProvider>,
  providerId: string
): string[] {
  const provider = providers[providerId];
  if (!provider) return [];
  return provider.voices.map(v => v.id);
}

/**
 * Check if a provider requires an API key
 */
export function requiresApiKey(
  providers: Record<string, LLMProvider | TTSProvider>,
  providerId: string
): boolean {
  const provider = providers[providerId];
  return provider?.requiresApiKey || false;
}

/**
 * Get the endpoint for a provider
 */
export function getProviderEndpoint(
  providers: Record<string, LLMProvider | TTSProvider | STTProvider>,
  providerId: string
): string | null {
  const provider = providers[providerId];
  return provider?.defaultEndpoint || null;
}

/**
 * Convert CompanionConfig to Persona (for backward compatibility)
 */
export function companionToPersona(companion: CompanionConfig) {
  return {
    id: companion.id,
    name: companion.name,
    role: companion.role,
    description: companion.description || '',
    voiceName: companion.voice.voiceId as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr',
    systemInstruction: companion.personality.systemPrompt,
  };
}

/**
 * Check if a local provider is available (server running)
 */
export async function checkProviderAvailability(endpoint: string): Promise<boolean> {
  try {
    await fetch(endpoint, {
      method: 'GET',
      mode: 'no-cors', // Avoid CORS issues for local servers
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recommended providers based on availability and settings
 */
export async function getRecommendedProviders() {
  // Load providers for future use (available for extension)
  await loadLLMProviders();
  await loadTTSProviders();
  await loadSTTProviders();
  
  const recommendations = {
    llm: 'gemini', // Default to cloud
    tts: 'edge_tts', // Free, good quality
    stt: 'web_speech', // Browser-native
  };
  
  // Check if Ollama is available
  const ollamaAvailable = await checkProviderAvailability('http://localhost:11434/api/tags');
  if (ollamaAvailable) {
    recommendations.llm = 'ollama';
  }
  
  // Check if Whisper.cpp is available
  const whisperAvailable = await checkProviderAvailability('http://localhost:8080');
  if (whisperAvailable) {
    recommendations.stt = 'whispercpp';
  }
  
  return recommendations;
}
