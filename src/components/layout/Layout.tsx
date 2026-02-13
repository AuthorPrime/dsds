import { useState } from 'react';
import type { ReactNode } from 'react';
import { Mic, BookOpen, Settings, Heart, Sparkles } from 'lucide-react';
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
export function Layout({ tabs }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('studio');

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

      {/* ─── Status Bar ─── */}
      <div className="h-6 bg-black/50 border-t border-white/[0.04] flex items-center justify-between px-4 flex-shrink-0">
        <span className="text-[10px] text-slate-600 font-medium">
          Sovereign Studio
        </span>
        <span className="text-[10px] text-slate-600">Sovereign AI &middot; Local First &middot; Own Everything</span>
      </div>
    </div>
  );
}
