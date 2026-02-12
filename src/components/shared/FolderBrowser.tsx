/**
 * FolderBrowser - Browse a folder and select files to import
 * Uses Tauri FS to list directory contents, falls back to browser file input.
 */

import { useState, useCallback, useRef } from 'react';
import {
  FolderOpen, FileText, FileAudio, Image, File, Upload,
  CheckSquare, Square, Loader2, AlertCircle,
} from 'lucide-react';
import { isTauri } from '../../services/fileManager';

interface BrowsedFile {
  name: string;
  path: string;
  selected: boolean;
  type: 'text' | 'audio' | 'image' | 'other';
}

interface FolderBrowserProps {
  /** Label shown above the picker */
  label?: string;
  /** Filter function for file names — OR array of extensions like ['.txt', '.md'] */
  fileFilter?: ((name: string) => boolean) | string[];
  /** Called with the array of selected file paths/names and optional browser File refs */
  onFilesSelected: (files: Array<{ name: string; path: string; file?: File }>) => void;
  /** Additional CSS classes */
  className?: string;
}

function getFileType(name: string): BrowsedFile['type'] {
  const lower = name.toLowerCase();
  if (/\.(md|txt|json|csv|html|xml|yaml|yml|toml)$/.test(lower)) return 'text';
  if (/\.(mp3|wav|ogg|m4a|flac|aac|webm|wma)$/.test(lower)) return 'audio';
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/.test(lower)) return 'image';
  return 'other';
}

function FileTypeIcon({ type }: { type: BrowsedFile['type'] }) {
  switch (type) {
    case 'text': return <FileText size={16} className="text-blue-400" />;
    case 'audio': return <FileAudio size={16} className="text-cyan-400" />;
    case 'image': return <Image size={16} className="text-amber-400" />;
    default: return <File size={16} className="text-gray-400" />;
  }
}

export function FolderBrowser({
  label = 'Import Files',
  fileFilter,
  onFilesSelected,
  className = '',
}: FolderBrowserProps) {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<BrowsedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize fileFilter to a function
  const filterFn = useCallback((name: string): boolean => {
    if (!fileFilter) return true;
    if (Array.isArray(fileFilter)) {
      const lower = name.toLowerCase();
      return fileFilter.some(ext => lower.endsWith(ext.toLowerCase()));
    }
    return fileFilter(name);
  }, [fileFilter]);

  const browseFolder = useCallback(async () => {
    setError(null);

    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
        });

        if (!selected) return;
        setFolderPath(selected as string);
        setIsLoading(true);

        const { readDir } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(selected as string);

        const browsed: BrowsedFile[] = entries
          .filter(entry => entry.name && !entry.name.startsWith('.'))
          .filter(entry => !entry.isDirectory)
          .filter(entry => filterFn(entry.name))
          .map(entry => ({
            name: entry.name,
            path: `${selected}${navigator.userAgent.includes('Windows') ? '\\' : '/'}${entry.name}`,
            selected: true,
            type: getFileType(entry.name),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setFiles(browsed);
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to read folder');
      }
    } else {
      // Browser fallback - use file input
      inputRef.current?.click();
    }
  }, [filterFn]);

  // Store browser File references for read access
  const browserFilesRef = useRef<Map<string, File>>(new Map());

  const handleBrowserFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    browserFilesRef.current.clear();
    const browsed: BrowsedFile[] = Array.from(fileList)
      .filter(f => filterFn(f.name))
      .map(f => {
        browserFilesRef.current.set(f.name, f);
        return {
          name: f.name,
          path: f.name,
          selected: true,
          type: getFileType(f.name),
        };
      });

    setFiles(browsed);
    setFolderPath('Selected files');
    e.target.value = '';
  }, [filterFn]);

  const toggleFile = (index: number) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, selected: !f.selected } : f));
  };

  const toggleAll = (selected: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, selected })));
  };

  const handleUseSelected = () => {
    const selected = files.filter(f => f.selected).map(({ name, path }) => ({
      name,
      path,
      file: browserFilesRef.current.get(name),
    }));
    if (selected.length > 0) onFilesSelected(selected);
  };

  const selectedCount = files.filter(f => f.selected).length;

  return (
    <div className={`bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
            <Upload size={16} /> {label}
          </h3>
          {folderPath && (
            <p className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={folderPath}>
              {folderPath}
            </p>
          )}
        </div>
        <button
          onClick={browseFolder}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cyan-400 hover:bg-white/10 hover:border-cyan-500/30 transition-colors"
        >
          <FolderOpen size={14} /> Browse
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-6 text-center">
          <Loader2 size={20} className="animate-spin mx-auto text-cyan-400 mb-2" />
          <p className="text-xs text-gray-500">Scanning folder...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 mx-4 mt-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <>
          {/* Select controls */}
          <div className="px-4 pt-3 flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => toggleAll(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Select None
              </button>
            </div>
            <span className="text-xs text-gray-500">
              {selectedCount} of {files.length} selected
            </span>
          </div>

          {/* File list */}
          <div className="max-h-48 overflow-y-auto p-4 space-y-1">
            {files.map((file, i) => (
              <button
                key={file.path}
                onClick={() => toggleFile(i)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                  file.selected
                    ? 'bg-cyan-900/15 border border-cyan-500/20'
                    : 'bg-transparent border border-transparent hover:bg-white/5'
                }`}
              >
                {file.selected
                  ? <CheckSquare size={16} className="text-cyan-400 flex-shrink-0" />
                  : <Square size={16} className="text-gray-600 flex-shrink-0" />
                }
                <FileTypeIcon type={file.type} />
                <span className="text-sm text-slate-300 truncate flex-1">{file.name}</span>
              </button>
            ))}
          </div>

          {/* Action button */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleUseSelected}
              disabled={selectedCount === 0}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              Import {selectedCount} file{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && files.length === 0 && !error && (
        <div className="p-6 text-center">
          <FolderOpen size={24} className="mx-auto text-gray-600 mb-2" />
          <p className="text-xs text-gray-500">Click Browse to select a folder</p>
        </div>
      )}

      {/* Browser fallback input */}
      {!isTauri() && (
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleBrowserFiles}
        />
      )}
    </div>
  );
}
