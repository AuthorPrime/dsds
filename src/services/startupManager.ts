/**
 * Startup Manager — Ollama Lifecycle & Readiness Orchestrator
 *
 * On every app launch:
 * 1. Kill orphaned Ollama processes from previous sessions
 * 2. Start a fresh Ollama instance on the expected port
 * 3. Wait for it to be healthy (ping the API)
 * 4. Check which models are installed vs what DSDS needs
 * 5. Pull any missing models (with progress callback)
 * 6. Signal "ready" so the main UI can load
 *
 * Uses Tauri shell plugin for process management, browser fetch for API health.
 * Falls back gracefully in browser-only mode (no process management).
 */

import { isTauri } from './fileManager';
import { getSettings } from '../hooks/useSettings';

/* ─── Types ─── */

export type StartupStage =
  | 'initializing'
  | 'killing_orphans'
  | 'starting_ollama'
  | 'waiting_healthy'
  | 'checking_models'
  | 'pulling_model'
  | 'ready'
  | 'error';

export interface StartupProgress {
  stage: StartupStage;
  message: string;
  detail?: string;
  /** 0–100 for model pull progress, undefined otherwise */
  percent?: number;
}

export interface StartupResult {
  success: boolean;
  ollamaRunning: boolean;
  models: string[];
  missingModels: string[];
  error?: string;
}

/** Models that DSDS needs to function */
const REQUIRED_MODELS = ['qwen2.5:7b'];

const OLLAMA_URL = 'http://localhost:11434';
const HEALTH_TIMEOUT = 3000;
const HEALTH_RETRIES = 15;      // 15 × 2s = 30s max wait
const HEALTH_RETRY_DELAY = 2000;

/* ─── Helpers ─── */

/** Check if Ollama API responds */
async function pingOllama(): Promise<boolean> {
  try {
    const res = await fetch(OLLAMA_URL, { signal: AbortSignal.timeout(HEALTH_TIMEOUT) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Get list of installed model names */
async function fetchInstalledModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.models?.map((m: { name: string }) => m.name) ?? [];
  } catch {
    return [];
  }
}

/** Kill orphaned Ollama processes via Tauri shell (allowlisted commands) */
async function killOrphanedOllama(): Promise<void> {
  if (!isTauri()) return;

  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const isWindows = navigator.userAgent.includes('Windows');
    const cmdName = isWindows ? 'kill-ollama-win' : 'kill-ollama-unix';

    const cmd = Command.create(cmdName);
    await cmd.execute();

    // Brief pause to let OS clean up the port
    await sleep(1000);
  } catch {
    // Process may not exist — that's fine
  }
}

/** Start a fresh Ollama server via Tauri shell (allowlisted commands) */
async function startOllamaServer(): Promise<void> {
  if (!isTauri()) return;

  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const isWindows = navigator.userAgent.includes('Windows');
    const cmdName = isWindows ? 'start-ollama-win' : 'start-ollama-unix';

    const cmd = Command.create(cmdName);
    await cmd.execute();
  } catch (err) {
    console.warn('[StartupManager] Failed to start Ollama:', err);
    throw new Error('Could not start Ollama. Is it installed?');
  }
}

/** Wait for Ollama to become healthy with retries */
async function waitForHealthy(
  onProgress: (msg: string) => void,
): Promise<boolean> {
  for (let attempt = 1; attempt <= HEALTH_RETRIES; attempt++) {
    const ok = await pingOllama();
    if (ok) return true;

    onProgress(`Waiting for Ollama... (${attempt}/${HEALTH_RETRIES})`);
    await sleep(HEALTH_RETRY_DELAY);
  }
  return false;
}

/** Pull a model with progress streaming */
async function pullModel(
  modelName: string,
  onProgress: (percent: number, status: string) => void,
): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!res.ok) return false;

    const reader = res.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let lastPercent = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const chunk = JSON.parse(line);

          // Compute progress percentage from total/completed
          if (chunk.total && chunk.completed) {
            lastPercent = Math.round((chunk.completed / chunk.total) * 100);
          }

          const status = chunk.status ?? 'downloading';
          onProgress(lastPercent, status);

          // Check for error
          if (chunk.error) {
            console.error('[StartupManager] Pull error:', chunk.error);
            return false;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    return true;
  } catch (err) {
    console.error('[StartupManager] Pull failed:', err);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ─── Main Orchestrator ─── */

/**
 * Run the full startup sequence.
 * Calls onProgress at each stage so the UI can show status.
 */
export async function runStartupSequence(
  onProgress: (progress: StartupProgress) => void,
): Promise<StartupResult> {
  const settings = getSettings();
  const requiredModel = settings.llmModel || REQUIRED_MODELS[0];
  // Combine user's selected model with hardcoded requirements (deduplicated)
  const allRequired = [...new Set([requiredModel, ...REQUIRED_MODELS])];

  try {
    // ─── Step 1: Check if Ollama is already running ───
    onProgress({ stage: 'initializing', message: 'Checking AI engine...' });
    const alreadyRunning = await pingOllama();

    if (isTauri()) {
      // ─── Step 2: Kill orphaned processes ───
      if (alreadyRunning) {
        onProgress({ stage: 'killing_orphans', message: 'Clearing stale AI processes...' });
        await killOrphanedOllama();
      }

      // ─── Step 3: Start fresh Ollama server ───
      onProgress({ stage: 'starting_ollama', message: 'Starting AI engine...' });
      await startOllamaServer();

      // ─── Step 4: Wait for healthy ───
      onProgress({ stage: 'waiting_healthy', message: 'Waiting for AI engine...' });
      const healthy = await waitForHealthy((msg) => {
        onProgress({ stage: 'waiting_healthy', message: msg });
      });

      if (!healthy) {
        onProgress({
          stage: 'error',
          message: 'Ollama did not respond',
          detail: 'Make sure Ollama is installed. Visit ollama.com to download.',
        });
        return {
          success: false,
          ollamaRunning: false,
          models: [],
          missingModels: allRequired,
          error: 'Ollama did not become healthy after 30 seconds',
        };
      }
    } else {
      // Browser mode — just check if it's available
      if (!alreadyRunning) {
        onProgress({
          stage: 'error',
          message: 'Ollama not detected',
          detail: 'Start Ollama manually: run "ollama serve" in a terminal.',
        });
        return {
          success: false,
          ollamaRunning: false,
          models: [],
          missingModels: allRequired,
          error: 'Ollama not running (browser mode — cannot start automatically)',
        };
      }
    }

    // ─── Step 5: Check installed models ───
    onProgress({ stage: 'checking_models', message: 'Checking installed models...' });
    const installedModels = await fetchInstalledModels();

    // Normalize model names for comparison (strip :latest suffix)
    const normalize = (name: string) => name.replace(/:latest$/, '');
    const installedNormalized = new Set(installedModels.map(normalize));
    const missing = allRequired.filter(m => !installedNormalized.has(normalize(m)));

    // ─── Step 6: Pull missing models ───
    if (missing.length > 0) {
      for (const model of missing) {
        onProgress({
          stage: 'pulling_model',
          message: `Downloading ${model}...`,
          detail: 'This may take a few minutes on first run',
          percent: 0,
        });

        const ok = await pullModel(model, (percent, status) => {
          onProgress({
            stage: 'pulling_model',
            message: `Downloading ${model}...`,
            detail: status,
            percent,
          });
        });

        if (!ok) {
          onProgress({
            stage: 'error',
            message: `Failed to download ${model}`,
            detail: 'Check your internet connection and try again.',
          });
          return {
            success: false,
            ollamaRunning: true,
            models: installedModels,
            missingModels: missing,
            error: `Failed to pull model: ${model}`,
          };
        }
      }
    }

    // ─── Step 7: Ready! ───
    const finalModels = await fetchInstalledModels();
    onProgress({ stage: 'ready', message: 'AI engine ready' });

    return {
      success: true,
      ollamaRunning: true,
      models: finalModels,
      missingModels: [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown startup error';
    onProgress({
      stage: 'error',
      message: 'Startup failed',
      detail: message,
    });
    return {
      success: false,
      ollamaRunning: false,
      models: [],
      missingModels: allRequired,
      error: message,
    };
  }
}

/**
 * Quick health check — just pings Ollama without the full lifecycle.
 * Useful for the Settings tab status indicator.
 */
export { pingOllama as checkOllamaHealth };
