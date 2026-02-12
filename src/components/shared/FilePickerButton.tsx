/**
 * FilePickerButton - Reusable native file/folder picker
 * Uses Tauri dialog plugin when available, falls back to browser input.
 */

import { useRef } from 'react';
import { FolderOpen, FileUp } from 'lucide-react';
import { isTauri } from '../../services/fileManager';

interface FilePickerButtonProps {
  /** Pick a folder, single file, or multiple files */
  mode: 'folder' | 'file' | 'files';
  /** Button label text */
  label?: string;
  /** Custom icon (defaults to FolderOpen or FileUp) */
  icon?: React.ReactNode;
  /** File type filters for file mode */
  filters?: Array<{ name: string; extensions: string[] }>;
  /** Starting path for the dialog */
  currentPath?: string;
  /** Called with selected path(s) */
  onSelect: (paths: string | string[]) => void;
  /** Additional CSS classes */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
}

export function FilePickerButton({
  mode,
  label,
  icon,
  filters,
  currentPath,
  onSelect,
  className = '',
  disabled = false,
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultLabel = mode === 'folder' ? 'Choose Folder' : mode === 'files' ? 'Choose Files' : 'Choose File';
  const DefaultIcon = mode === 'folder' ? FolderOpen : FileUp;

  const handleClick = async () => {
    if (disabled) return;

    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');

        if (mode === 'folder') {
          const selected = await open({
            directory: true,
            multiple: false,
            defaultPath: currentPath,
          });
          if (selected) onSelect(selected as string);
        } else if (mode === 'files') {
          const selected = await open({
            directory: false,
            multiple: true,
            filters: filters,
            defaultPath: currentPath,
          });
          if (selected) onSelect(selected as string[]);
        } else {
          const selected = await open({
            directory: false,
            multiple: false,
            filters: filters,
            defaultPath: currentPath,
          });
          if (selected) onSelect(selected as string);
        }
      } catch (err) {
        console.error('[FilePickerButton] Dialog error:', err);
      }
    } else {
      // Browser fallback
      inputRef.current?.click();
    }
  };

  const handleBrowserInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mode === 'files') {
      onSelect(Array.from(files).map(f => f.name));
    } else {
      onSelect(files[0].name);
    }
    e.target.value = '';
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {icon || <DefaultIcon size={16} />}
        {label || defaultLabel}
      </button>

      {/* Hidden browser fallback input */}
      {!isTauri() && (
        <input
          ref={inputRef}
          type="file"
          multiple={mode === 'files'}
          // @ts-expect-error webkitdirectory is non-standard but widely supported
          webkitdirectory={mode === 'folder' ? '' : undefined}
          className="hidden"
          onChange={handleBrowserInput}
        />
      )}
    </>
  );
}
