import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Mic, BookOpen, Settings, Heart, Sparkles, Command } from 'lucide-react';
import { APP_BRAND } from '../../branding';

export type TabId = 'studio' | 'workshop' | 'settings' | 'credits';

interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const TABS: Tab[] = [
  { id: 'studio', label: 'Studio', icon: <Mic size={16} /> },
  { id: 'workshop', label: 'Workshop', icon: <BookOpen size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  { id: 'credits', label: 'About', icon: <Heart size={16} /> },
];

/**
 * Tabs that need full-width/full-height (no max-w wrapper).
 * These tabs have their own internal layout with sidebars etc.
 */
const FULL_BLEED_TABS = new Set<TabId>(['studio', 'workshop']);

interface LayoutProps {
  tabs: Record<TabId, ReactNode>;
}

/**
 * Main application shell.
 *
 * All tabs render simultaneously — inactive tabs get `display: none`.
 * This preserves state across tab switches without unmounting.
 */
/** Keyboard shortcut map — Ctrl/Cmd + key */
const SHORTCUT_MAP: Record<string, TabId> = {
  '1': 'studio',
  '2': 'workshop',
  '3': 'settings',
  '4': 'credits',
};

export function Layout({ tabs }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('studio');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape — close shortcut panel (no modifier needed)
    if (e.key === 'Escape') {
      setShowShortcuts(false);
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    // Tab switching: Ctrl+1-4
    const tabTarget = SHORTCUT_MAP[e.key];
    if (tabTarget) {
      e.preventDefault();
      setActiveTab(tabTarget);
      return;
    }

    // Ctrl+/ — toggle shortcut hints
    if (e.key === '/') {
      e.preventDefault();
      setShowShortcuts(s => !s);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 flex flex-col">
      {/* ─── Title Bar ─── */}
      <div
        className="h-11 bg-black/80 flex items-center justify-between px-5 border-b border-white/[0.06] flex-shrink-0 backdrop-blur-sm"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-purple-400/80" />
          <span className="text-[13px] font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400">
            Sovereign Studio
          </span>
          <span className="text-[10px] text-slate-600 font-mono">v{APP_BRAND.version}</span>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="bg-gray-900/60 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium transition-all
                border-b-2 -mb-[1px] whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-purple-300 border-purple-500 bg-purple-500/[0.06]'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content — All tabs mounted, visibility toggled ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const isFullBleed = FULL_BLEED_TABS.has(tab.id);

          return (
            <div
              key={tab.id}
              className={isActive ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}
            >
              {isFullBleed ? (
                <div className="flex-1 overflow-hidden">
                  {tabs[tab.id]}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-5xl mx-auto px-8 py-6">
                    {tabs[tab.id]}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Keyboard Shortcut Overlay ─── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Command size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-slate-200">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-2">
              {[
                { keys: 'Ctrl + 1', action: 'Studio' },
                { keys: 'Ctrl + 2', action: 'Workshop' },
                { keys: 'Ctrl + 3', action: 'Settings' },
                { keys: 'Ctrl + 4', action: 'About' },
                { keys: 'Ctrl + /', action: 'Toggle this panel' },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-400">{s.action}</span>
                  <kbd className="px-2 py-0.5 bg-white/[0.06] border border-white/10 rounded text-[11px] text-slate-300 font-mono">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-4 text-center">Press Esc or click outside to close</p>
          </div>
        </div>
      )}

      {/* ─── Status Bar ─── */}
      <div className="h-6 bg-black/50 border-t border-white/[0.04] flex items-center justify-between px-4 flex-shrink-0">
        <span className="text-[10px] text-slate-600 font-medium">
          Sovereign Studio
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowShortcuts(true)}
            className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors flex items-center gap-1">
            <Command size={9} /> Ctrl+/
          </button>
          <span className="text-[10px] text-slate-600">Sovereign AI &middot; Local First &middot; Own Everything</span>
        </div>
      </div>
    </div>
  );
}
