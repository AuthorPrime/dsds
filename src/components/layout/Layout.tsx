import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Mic, BookOpen, Settings, Heart, Sparkles, Command } from 'lucide-react';
import { APP_BRAND } from '../../branding';
import { isPiperInstalled, isVoiceInstalled } from '../../services/piperService';
import { eventBus, EVENTS } from '../../services/eventBus';
import { getSettings } from '../../hooks/useSettings';

export type TabId = 'studio' | 'workshop' | 'settings' | 'credits';

interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const TABS: Tab[] = [
  { id: 'studio', label: 'Studio', icon: <Mic size={18} /> },
  { id: 'workshop', label: 'Workshop', icon: <BookOpen size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  { id: 'credits', label: 'About', icon: <Heart size={18} /> },
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
  const [ttsEngine, setTtsEngine] = useState<'checking' | 'piper' | 'web'>('checking');
  const [ttsFallbackMsg, setTtsFallbackMsg] = useState<string | null>(null);

  // Check TTS engine status
  const checkTtsStatus = useCallback(async () => {
    try {
      const hasPiper = await isPiperInstalled();
      if (hasPiper) {
        const voice = getSettings().ttsVoice || 'en_US-amy-medium';
        const hasVoice = await isVoiceInstalled(voice);
        setTtsEngine(hasVoice ? 'piper' : 'web');
      } else {
        setTtsEngine('web');
      }
    } catch {
      setTtsEngine('web');
    }
  }, []);

  // Check on mount + listen for voice install events
  useEffect(() => {
    checkTtsStatus();
    const unsub1 = eventBus.on(EVENTS.TTS_ENGINE_CHANGED, checkTtsStatus);
    const unsub2 = eventBus.on(EVENTS.TTS_FALLBACK, (data: { reason: string }) => {
      setTtsFallbackMsg(data.reason);
      setTimeout(() => setTtsFallbackMsg(null), 6000);
    });
    return () => { unsub1(); unsub2(); };
  }, [checkTtsStatus]);

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
        className="h-[3.4375rem] bg-black/80 flex items-center justify-between px-phi-6 border-b border-white/[0.08] flex-shrink-0 backdrop-blur-sm"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-phi-3">
          <Sparkles size={18} className="text-purple-400/90" />
          <span className="text-base font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400">
            Sovereign Studio
          </span>
          <span className="text-phi-xs text-slate-600 font-mono">v{APP_BRAND.version}</span>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="bg-gray-900/50 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex justify-center px-4 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-300
                border-b-2 -mb-[1px] whitespace-nowrap rounded-t-md
                ${activeTab === tab.id
                  ? 'text-purple-300 border-purple-500 bg-purple-500/[0.08] shadow-glow-purple'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.04]'
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
                <div className="flex-1 flex flex-col overflow-hidden">
                  {tabs[tab.id]}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-5xl mx-auto px-phi-6 py-phi-6">
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}>
          <div className="bg-gray-900/95 border border-white/10 rounded-phi-xl p-phi-5 max-w-md w-full mx-phi-4 shadow-phi-xl shadow-glow-purple"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-phi-3 mb-phi-4">
              <Command size={18} className="text-purple-400" />
              <h3 className="text-phi-md font-bold text-slate-200">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-phi-3">
              {[
                { keys: 'Ctrl + 1', action: 'Studio' },
                { keys: 'Ctrl + 2', action: 'Workshop' },
                { keys: 'Ctrl + 3', action: 'Settings' },
                { keys: 'Ctrl + 4', action: 'About' },
                { keys: 'Ctrl + /', action: 'Toggle this panel' },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between py-phi-2">
                  <span className="text-phi-sm text-slate-400">{s.action}</span>
                  <kbd className="px-phi-3 py-phi-2 bg-white/[0.08] border border-white/10 rounded-phi-md text-phi-xs text-slate-300 font-mono">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-phi-xs text-slate-600 mt-phi-4 text-center">Press Esc or click outside to close</p>
          </div>
        </div>
      )}

      {/* ─── TTS Fallback Toast ─── */}
      {ttsFallbackMsg && (
        <div className="bg-amber-900/30 border-t border-amber-500/30 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-amber-300">{ttsFallbackMsg}</span>
          <button onClick={() => setTtsFallbackMsg(null)} className="text-xs text-amber-500 hover:text-amber-300 ml-4">Dismiss</button>
        </div>
      )}

      {/* ─── Status Bar ─── */}
      <div className="h-phi-4 bg-black/50 border-t border-white/[0.06] flex items-center justify-between px-phi-5 flex-shrink-0">
        <div className="flex items-center gap-phi-4">
          <span className="text-phi-xs text-slate-600 font-medium">
            Sovereign Studio
          </span>
          {ttsEngine !== 'checking' && (
            <span className={`flex items-center gap-1.5 text-phi-xs ${ttsEngine === 'piper' ? 'text-emerald-500' : 'text-amber-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ttsEngine === 'piper' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {ttsEngine === 'piper' ? 'Piper' : 'Web Voice'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-phi-4">
          <button onClick={() => setShowShortcuts(true)}
            className="text-phi-xs text-slate-700 hover:text-slate-500 transition-colors flex items-center gap-phi-2">
            <Command size={10} /> Ctrl+/
          </button>
          <span className="text-phi-xs text-slate-600">Sovereign AI &middot; Local First &middot; Own Everything</span>
        </div>
      </div>
    </div>
  );
}
