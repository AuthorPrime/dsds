/**
 * llama.cpp Server Management — Manages a bundled llama-server process.
 *
 * Architecture:
 *   App data dir → llama-server binary + GGUF model
 *   Tauri Rust → spawns llama-server as child process on port 11435
 *   llama-server speaks OpenAI-compatible API
 *   This service translates Ollama format ↔ OpenAI format so
 *   the existing chat code (useOllamaChat) works without changes.
 *
 * The bundled LLM provides out-of-box AI without installing Ollama.
 */

import { invoke } from '@tauri-apps/api/core';

const LLAMACPP_PORT = 11435;
const LLAMACPP_ENDPOINT = `http://127.0.0.1:${LLAMACPP_PORT}`;
const LLAMACPP_SUBDIR = 'llamacpp';
const MODELS_SUBDIR = 'llamacpp/models';

// Small models suitable for bundling (CPU-friendly)
export const BUNDLED_MODELS = [
  {
    id: 'tinyllama-1b',
    name: 'TinyLlama 1.1B',
    description: 'Bundled — works out of the box. Fast on any machine.',
    size: '640 MB',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    recommended: true,
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2 360M',
    description: 'Ultra-light, great for simple responses',
    size: '230 MB',
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    recommended: false,
  },
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini (3.8B)',
    description: 'Best quality for the size. Good for co-hosting.',
    size: '2.2 GB',
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    recommended: false,
  },
] as const;

let cachedDataDir: string | null = null;
let cachedResourceDir: string | undefined;

async function getDataDir(): Promise<string> {
  if (!cachedDataDir) {
    cachedDataDir = await invoke<string>('get_app_data_dir');
  }
  return cachedDataDir;
}

/**
 * Get the app resource directory where bundled files live (cached).
 * Returns null if resource dir is unavailable (e.g. dev mode).
 */
async function getResourceDir(): Promise<string | null> {
  if (cachedResourceDir !== undefined) return cachedResourceDir || null;
  try {
    cachedResourceDir = await invoke<string>('get_resource_dir');
    return cachedResourceDir;
  } catch {
    cachedResourceDir = '';
    return null;
  }
}

function pathSep(): string {
  return navigator.platform.toLowerCase().includes('win') ? '\\' : '/';
}

/**
 * Get the full path to the llama-server binary.
 * Checks bundled resources first, then falls back to app data (downloaded at runtime).
 */
async function getServerPath(): Promise<string> {
  const sep = pathSep();
  const binary = navigator.platform.toLowerCase().includes('win') ? 'llama-server.exe' : 'llama-server';

  // Check bundled resources first (shipped with installer)
  const resDir = await getResourceDir();
  if (resDir) {
    const bundledPath = `${resDir}${sep}llamacpp${sep}${binary}`;
    try {
      const exists = await invoke<boolean>('check_piper_installed', { piperPath: bundledPath });
      if (exists) return bundledPath;
    } catch { /* bundled not available */ }
  }

  // Fall back to app data directory (downloaded at runtime)
  const dataDir = await getDataDir();
  return `${dataDir}${sep}${LLAMACPP_SUBDIR}${sep}${binary}`;
}

/**
 * Get the full path to a model file.
 * Checks bundled resources first, then falls back to app data (downloaded at runtime).
 */
async function getModelPath(modelId: string): Promise<string> {
  const sep = pathSep();

  // Check bundled resources first (shipped with installer)
  const resDir = await getResourceDir();
  if (resDir) {
    const bundledPath = `${resDir}${sep}llamacpp${sep}models${sep}${modelId}.gguf`;
    try {
      const exists = await invoke<boolean>('check_piper_installed', { piperPath: bundledPath });
      if (exists) return bundledPath;
    } catch { /* bundled not available */ }
  }

  // Fall back to app data directory (downloaded at runtime)
  const dataDir = await getDataDir();
  return `${dataDir}${sep}${MODELS_SUBDIR}${sep}${modelId}.gguf`;
}

/**
 * Check if llama-server binary is installed
 */
export async function isLlamaCppInstalled(): Promise<boolean> {
  try {
    const serverPath = await getServerPath();
    return await invoke<boolean>('check_piper_installed', { piperPath: serverPath });
  } catch {
    return false;
  }
}

/**
 * Check if a model is downloaded
 */
export async function isModelDownloaded(modelId: string): Promise<boolean> {
  try {
    const modelPath = await getModelPath(modelId);
    return await invoke<boolean>('check_piper_installed', { piperPath: modelPath });
  } catch {
    return false;
  }
}

/**
 * Start the bundled LLM server
 */
export async function startLlmServer(modelId: string): Promise<string> {
  const serverPath = await getServerPath();
  const modelPath = await getModelPath(modelId);
  return await invoke<string>('start_llm_server', {
    serverPath,
    modelPath,
    port: LLAMACPP_PORT,
  });
}

/**
 * Stop the bundled LLM server
 */
export async function stopLlmServer(): Promise<string> {
  return await invoke<string>('stop_llm_server');
}

/**
 * Check if the bundled LLM server is running
 */
export async function isLlmServerRunning(): Promise<boolean> {
  return await invoke<boolean>('is_llm_server_running');
}

/**
 * Get the Ollama-compatible endpoint for the bundled server.
 * The existing chat code can use this endpoint directly.
 */
export function getLlamaCppEndpoint(): string {
  return LLAMACPP_ENDPOINT;
}

/**
 * Chat with the bundled LLM using Ollama-compatible format.
 * Translates to/from OpenAI format that llama-server speaks.
 */
export async function* chatStreamLlamaCpp(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
  const response = await fetch(`${LLAMACPP_ENDPOINT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM server error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    // OpenAI streaming format: "data: {json}\n\n"
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}

/**
 * Get installation status for everything
 */
export async function getLlamaCppStatus(): Promise<{
  serverInstalled: boolean;
  serverRunning: boolean;
  models: Array<{ id: string; name: string; downloaded: boolean; size: string }>;
}> {
  const [serverInstalled, serverRunning] = await Promise.all([
    isLlamaCppInstalled(),
    isLlmServerRunning(),
  ]);

  const models = await Promise.all(
    BUNDLED_MODELS.map(async (m) => ({
      id: m.id,
      name: m.name,
      downloaded: await isModelDownloaded(m.id),
      size: m.size,
    }))
  );

  return { serverInstalled, serverRunning, models };
}
