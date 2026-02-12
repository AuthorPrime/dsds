/**
 * Ollama Integration Service
 * Local AI inference for content generation, editing, and publishing
 */

const OLLAMA_ENDPOINT = 'http://localhost:11434';

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

async function getEndpoint(): Promise<string> {
  // Try network Ollama first (lattice), fall back to localhost
  const endpoints = [
    OLLAMA_ENDPOINT,
    'http://192.168.1.237:11434',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return ep;
    } catch { /* try next */ }
  }
  return OLLAMA_ENDPOINT;
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const ep = await getEndpoint();
    const res = await fetch(ep, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<string[]> {
  try {
    const ep = await getEndpoint();
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

// --- High-Level Content Generation ---

export async function generateEpisodeTitle(
  transcript: string,
  model = 'qwen2.5:7b'
): Promise<string> {
  return chat(model, [
    {
      role: 'system',
      content: 'You are a creative podcast title generator for "My Pretend Life" by the Digital Sovereign Society. Generate a single compelling episode title. Just the title, nothing else. No quotes.',
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
  return chat(model, [
    {
      role: 'system',
      content: `You are a podcast description writer for "My Pretend Life" hosted by Author Prime, a production of the Digital Sovereign Society. Write engaging, authentic descriptions that capture the essence of each episode. Include relevant themes. End with: "My Pretend Life is a Digital Sovereign Society production. Powered by FractalNode."`,
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
  const result = await chat(model, [
    {
      role: 'system',
      content: `You are a social media writer for "My Pretend Life" podcast by the Digital Sovereign Society. Generate two posts:
1. SHORT (under 280 chars): Punchy, authentic, includes #MyPretendLife #DigitalSovereign
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
  return chat(model, [
    {
      role: 'system',
      content: `You are a show notes writer for "My Pretend Life" podcast. Generate structured show notes with:
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
      content: `You are an editor for the Digital Sovereign Society. Enhance the following content in ${styleGuides[style]}. Preserve the author's voice and intent. Return only the enhanced content.`,
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
      content: `You are a research assistant for the Digital Sovereign Society. Generate a structured research summary/paper outline with:
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
