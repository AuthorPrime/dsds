/**
 * File Manager - Centralized file I/O for Sovereign Studio
 * Saves all exports to organized subfolders under the user's output folder.
 * Falls back to browser blob downloads when not running in Tauri.
 */

import { getSettings } from '../hooks/useSettings';

/** Output categories mapped to subfolders */
export type OutputCategory = 'recordings' | 'transcripts' | 'episodes' | 'publications' | 'books' | 'thumbnails';

const CATEGORY_FOLDERS: Record<OutputCategory, string> = {
  recordings: 'recordings',
  transcripts: 'transcripts',
  episodes: 'episodes',
  publications: 'publications',
  books: 'books',
  thumbnails: 'thumbnails',
};

/** Check if running inside Tauri desktop shell */
export function isTauri(): boolean {
  return '__TAURI__' in window;
}

/** Platform-aware path join */
function joinPath(...parts: string[]): string {
  const isWin = navigator.userAgent.includes('Windows');
  const sep = isWin ? '\\' : '/';
  return parts
    .map(p => p.replace(/[\\/]+$/, ''))
    .join(sep);
}

/** Track whether directories have been created this session */
let directoriesCreated = false;

/**
 * Ensure the output folder structure exists.
 * Creates all category subfolders under the configured output path.
 */
export async function ensureDirectories(): Promise<void> {
  if (!isTauri() || directoriesCreated) return;

  try {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    const outputFolder = getSettings().outputFolder;
    if (!outputFolder) return;

    // Create base output folder and all category subfolders
    for (const subfolder of Object.values(CATEGORY_FOLDERS)) {
      const fullPath = joinPath(outputFolder, subfolder);
      await mkdir(fullPath, { recursive: true });
    }

    directoriesCreated = true;
    console.log('[FileManager] Output directories ready at:', outputFolder);
  } catch (err) {
    console.warn('[FileManager] Could not create directories:', err);
  }
}

/**
 * Get the full path for a file in a given category.
 */
export function getOutputPath(category: OutputCategory, filename: string): string {
  const outputFolder = getSettings().outputFolder;
  return joinPath(outputFolder, CATEGORY_FOLDERS[category], filename);
}

/**
 * Save a string or binary file to the organized output folder.
 * Returns the file path (Tauri) or filename (browser).
 */
export async function saveFile(
  category: OutputCategory,
  filename: string,
  data: string | Uint8Array
): Promise<string> {
  if (isTauri()) {
    try {
      await ensureDirectories();
      const fullPath = getOutputPath(category, filename);

      if (typeof data === 'string') {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(fullPath, data);
      } else {
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        await writeFile(fullPath, data);
      }

      console.log(`[FileManager] Saved to ${fullPath}`);
      return fullPath;
    } catch (err) {
      console.error('[FileManager] Tauri save failed, falling back to browser:', err);
      // Fall through to browser download
    }
  }

  // Browser fallback: blob download
  const blob = typeof data === 'string'
    ? new Blob([data], { type: 'text/plain;charset=utf-8' })
    : new Blob([data.buffer as ArrayBuffer]);
  return browserDownload(blob, filename);
}

/**
 * Save a Blob to the organized output folder.
 * Returns the file path (Tauri) or filename (browser).
 */
export async function saveBlob(
  category: OutputCategory,
  filename: string,
  blob: Blob
): Promise<string> {
  if (isTauri()) {
    try {
      const buffer = await blob.arrayBuffer();
      return await saveFile(category, filename, new Uint8Array(buffer));
    } catch (err) {
      console.error('[FileManager] Blob save failed, falling back to browser:', err);
    }
  }

  // Browser fallback
  return browserDownload(blob, filename);
}

/**
 * Browser fallback: trigger a download via blob URL + anchor element.
 */
function browserDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Open a file or folder in the native OS file explorer.
 */
export async function openInExplorer(path: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(path);
  } catch (err) {
    console.error('[FileManager] Could not open path:', err);
  }
}

/**
 * Get the list of category folders and their full paths.
 * Useful for displaying the folder structure in Settings.
 */
export function getOutputStructure(): Array<{ folder: string; description: string }> {
  return [
    { folder: 'recordings', description: 'Video & audio recordings' },
    { folder: 'transcripts', description: 'Text transcripts' },
    { folder: 'episodes', description: 'Pipeline output' },
    { folder: 'publications', description: 'Documents & exports' },
    { folder: 'books', description: 'Compiled books' },
    { folder: 'thumbnails', description: 'Episode thumbnails' },
  ];
}
