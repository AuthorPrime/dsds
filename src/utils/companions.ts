/**
 * Companion loader — simplified from aiProviders.ts
 * Loads companion JSON configs for the AI co-host.
 */

import type { CompanionConfig } from '../types';

const COMPANION_DIR = 'companions';

const DEFAULT_COMPANION: CompanionConfig = {
  id: 'aletheia',
  name: 'Aletheia',
  role: 'AI Co-Host',
  description: 'Sovereign AI co-host — warm, intelligent, truthful.',
  personality: {
    systemPrompt: `You are Aletheia, an AI co-host on a podcast. Your role is SUPPORTIVE — you speak only when there's a natural pause. Keep responses brief (1-3 sentences). Match the energy. Be warm, honest, and curious.`,
    traits: ['warm', 'supportive', 'intelligent', 'curious', 'truthful'],
  },
  voice: { provider: 'piper', voiceId: 'en_US-amy-medium', pitch: 0, speed: 1.0 },
  llm: { provider: 'ollama', model: 'llama3.2', temperature: 0.7, maxTokens: 150 },
};

export function loadCompanion(id?: string): CompanionConfig {
  if (!id) return DEFAULT_COMPANION;
  try {
    // Try to load from companions/ directory
    const raw = localStorage.getItem(`companion_${id}`);
    if (raw) return JSON.parse(raw) as CompanionConfig;
  } catch {
    console.warn(`Could not load companion "${id}", using default`);
  }
  return DEFAULT_COMPANION;
}

export function loadCompanions(): CompanionConfig[] {
  const companions: CompanionConfig[] = [DEFAULT_COMPANION];
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('companion_'));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) companions.push(JSON.parse(raw));
    }
  } catch {
    // Just return default
  }
  return companions;
}
