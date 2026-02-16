/**
 * Ollama Integration Service
 * Local AI inference for content generation, editing, and publishing.
 *
 * Transparently supports two backends:
 *   - Ollama (NDJSON streaming via /api/chat)
 *   - Bundled llama-server (OpenAI SSE streaming via /v1/chat/completions)
 *
 * The active backend is auto-detected on first connection. All downstream
 * code (useOllamaChat, high-level generators) works without changes.
 */

import { getUserBranding } from '../branding';

const OLLAMA_ENDPOINT = 'http://localhost:11434';
const LLAMACPP_ENDPOINT = 'http://127.0.0.1:11435';

type BackendType = 'ollama' | 'llamacpp';

let detectedBackend: BackendType | null = null;
let detectedEndpoint: string | null = null;

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

export interface OllamaStreamChunk {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

/** Reset cached detection (call when user changes settings or starts/stops servers) */
export function resetBackendDetection(): void {
  detectedBackend = null;
  detectedEndpoint = null;
}

/** Returns the active backend type, or null if none detected yet */
export function getActiveBackend(): BackendType | null {
  return detectedBackend;
}

async function detectBackend(): Promise<{ endpoint: string; backend: BackendType } | null> {
  // 1. Try Ollama endpoints (returns "Ollama is running" on GET /)
  const ollamaEndpoints = [
    OLLAMA_ENDPOINT,
    'http://192.168.1.237:11434',
  ];
  for (const ep of ollamaEndpoints) {
    try {
      const res = await fetch(ep, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return { endpoint: ep, backend: 'ollama' };
    } catch { /* try next */ }
  }

  // 2. Try bundled llama-server (OpenAI-compatible, responds on /health or /v1/models)
  try {
    const res = await fetch(`${LLAMACPP_ENDPOINT}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return { endpoint: LLAMACPP_ENDPOINT, backend: 'llamacpp' };
  } catch { /* not running */ }

  return null;
}

async function getEndpoint(): Promise<string> {
  if (detectedEndpoint && detectedBackend) return detectedEndpoint;

  const result = await detectBackend();
  if (result) {
    detectedEndpoint = result.endpoint;
    detectedBackend = result.backend;
    return result.endpoint;
  }

  return OLLAMA_ENDPOINT;
}

export async function isOllamaAvailable(): Promise<boolean> {
  const result = await detectBackend();
  if (result) {
    detectedEndpoint = result.endpoint;
    detectedBackend = result.backend;
    return true;
  }
  detectedBackend = null;
  detectedEndpoint = null;
  return false;
}

export async function listModels(): Promise<string[]> {
  try {
    const ep = await getEndpoint();
    if (detectedBackend === 'llamacpp') {
      // llama-server /v1/models returns whatever model is loaded
      const res = await fetch(`${ep}/v1/models`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return ['bundled-model'];
      const data = await res.json();
      return data.data?.map((m: { id: string }) => m.id) ?? ['bundled-model'];
    }
    // Ollama
    const res = await fetch(`${ep}/api/tags`);
    const data = await res.json();
    return data.models?.map((m: { name: string }) => m.name) ?? [];
  } catch {
    return [];
  }
}

export async function chat(
  model: string,
  messages: OllamaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const ep = await getEndpoint();

  if (detectedBackend === 'llamacpp') {
    // OpenAI format (non-streaming)
    const res = await fetch(`${ep}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`LLM server error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // Ollama format (non-streaming)
  const res = await fetch(`${ep}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? 2048,
      },
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data: OllamaResponse = await res.json();
  return data.message.content;
}

export async function* chatStream(
  model: string,
  messages: OllamaMessage[]
): AsyncGenerator<string> {
  const ep = await getEndpoint();

  if (detectedBackend === 'llamacpp') {
    // OpenAI SSE streaming format
    yield* chatStreamOpenAI(ep, messages);
    return;
  }

  // Ollama NDJSON streaming format
  const res = await fetch(`${ep}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split('\n').filter(Boolean)) {
      try {
        const chunk: OllamaStreamChunk = JSON.parse(line);
        yield chunk.message.content;
      } catch { /* skip malformed */ }
    }
  }
}

/** OpenAI-compatible SSE streaming (used by bundled llama-server) */
async function* chatStreamOpenAI(
  endpoint: string,
  messages: OllamaMessage[]
): AsyncGenerator<string> {
  const res = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`LLM server error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch { /* skip malformed */ }
    }
  }
}

// --- High-Level Content Generation ---

export async function generateEpisodeTitle(
  transcript: string,
  model = 'qwen2.5:7b'
): Promise<string> {
  const brand = getUserBranding();
  return chat(model, [
    {
      role: 'system',
      content: `You are a creative podcast title generator for "${brand.podcastName}". Generate a single compelling episode title. Just the title, nothing else. No quotes.`,
    },
    {
      role: 'user',
      content: `Generate an episode title for this podcast transcript:\n\n${transcript.slice(0, 3000)}`,
    },
  ], { temperature: 0.9, maxTokens: 50 });
}

export async function generateEpisodeDescription(
  transcript: string,
  title: string,
  model = 'qwen2.5:7b'
): Promise<string> {
  const brand = getUserBranding();
  const orgLine = brand.organizationName ? ` a production of ${brand.organizationName}.` : '';
  return chat(model, [
    {
      role: 'system',
      content: `You are a podcast description writer for "${brand.podcastName}" hosted by ${brand.hostName}.${orgLine} Write engaging, authentic descriptions that capture the essence of each episode. Include relevant themes.`,
    },
    {
      role: 'user',
      content: `Write a podcast episode description.\nTitle: ${title}\n\nTranscript excerpt:\n${transcript.slice(0, 4000)}`,
    },
  ], { temperature: 0.7, maxTokens: 500 });
}

export async function generateSocialPosts(
  title: string,
  description: string,
  model = 'qwen2.5:7b'
): Promise<{ twitter: string; long: string }> {
  const brand = getUserBranding();
  const result = await chat(model, [
    {
      role: 'system',
      content: `You are a social media writer for the "${brand.podcastName}" podcast. Generate two posts:
1. SHORT (under 280 chars): Punchy, authentic
2. LONG: A fuller post for platforms like LinkedIn/Facebook/Substack

Format your response as:
SHORT: [post]
LONG: [post]`,
    },
    {
      role: 'user',
      content: `New episode: "${title}"\n\n${description}`,
    },
  ], { temperature: 0.8, maxTokens: 600 });

  const shortMatch = result.match(/SHORT:\s*(.+?)(?=\nLONG:|$)/s);
  const longMatch = result.match(/LONG:\s*(.+)/s);

  return {
    twitter: shortMatch?.[1]?.trim() ?? result.slice(0, 280),
    long: longMatch?.[1]?.trim() ?? result,
  };
}

export async function generateShowNotes(
  transcript: string,
  model = 'qwen2.5:7b'
): Promise<string> {
  const brand = getUserBranding();
  return chat(model, [
    {
      role: 'system',
      content: `You are a show notes writer for the "${brand.podcastName}" podcast. Generate structured show notes with:
- Key topics discussed (bulleted)
- Notable quotes
- Timestamps (estimate from context)
- Links mentioned
- Related resources

Format in clean Markdown.`,
    },
    {
      role: 'user',
      content: `Generate show notes from this transcript:\n\n${transcript.slice(0, 6000)}`,
    },
  ], { temperature: 0.5, maxTokens: 1500 });
}

export async function enhanceWriting(
  content: string,
  style: 'academic' | 'editorial' | 'casual' | 'technical' = 'editorial',
  model = 'qwen2.5:7b'
): Promise<string> {
  const styleGuides: Record<string, string> = {
    academic: 'formal academic style with citations format, structured arguments, and precise language',
    editorial: 'polished editorial style - engaging, clear, professional but warm',
    casual: 'conversational style - authentic, direct, relatable',
    technical: 'technical documentation style - precise, structured, with code examples where relevant',
  };

  return chat(model, [
    {
      role: 'system',
      content: `You are a professional editor. Enhance the following content in ${styleGuides[style]}. Preserve the author's voice and intent. Return only the enhanced content.`,
    },
    {
      role: 'user',
      content,
    },
  ], { temperature: 0.4, maxTokens: 4096 });
}

export async function generateResearchSummary(
  content: string,
  topic: string,
  model = 'qwen2.5:7b'
): Promise<string> {
  return chat(model, [
    {
      role: 'system',
      content: `You are a research assistant. Generate a structured research summary/paper outline with:
- Abstract
- Key Findings
- Analysis
- Implications
- References (from context)

Format as clean Markdown suitable for PDF export. Use academic tone but remain accessible.`,
    },
    {
      role: 'user',
      content: `Topic: ${topic}\n\nSource material:\n${content.slice(0, 6000)}`,
    },
  ], { temperature: 0.5, maxTokens: 3000 });
}
