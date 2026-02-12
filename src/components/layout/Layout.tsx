import { useState } from 'react';
import type { ReactNode } from 'react';
import { Mic, Wand2, BookOpen, FileText, Settings, Sparkles, Library } from 'lucide-react';

type TabId = 'studio' | 'production' | 'publisher' | 'library' | 'docs' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const TABS: Tab[] = [
  { id: 'studio', label: 'Studio', icon: <Mic size={18} /> },
  { id: 'production', label: 'Production', icon: <Wand2 size={18} /> },
  { id: 'publisher', label: 'Publisher', icon: <BookOpen size={18} /> },
  { id: 'library', label: 'Library', icon: <Library size={18} /> },
  { id: 'docs', label: 'Docs', icon: <FileText size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

interface LayoutProps {
  children: (activeTab: TabId) => ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('studio');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 flex flex-col">
      {/* Title Bar */}
      <div
        className="h-12 bg-black/90 flex items-center justify-between px-5 border-b border-purple-900/30"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-purple-400" />
          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400">
            SOVEREIGN STUDIO
          </span>
          <span className="text-[10px] text-slate-600 font-mono ml-1">v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-purple-500/60 tracking-widest uppercase">
            Digital Sovereign Society
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-900/80 border-b border-gray-800/80">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all
                border-b-2 -mb-[1px]
                ${activeTab === tab.id
                  ? 'text-purple-300 border-purple-500 bg-purple-500/5'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/30'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {children(activeTab)}
        </div>
      </div>

      {/* Footer */}
      <div className="h-7 bg-black/60 border-t border-gray-800/50 flex items-center justify-between px-5">
        <span className="text-[10px] text-slate-600">My Pretend Life | FractalNode</span>
        <span className="text-[10px] text-slate-600">Sovereign AI • Local First</span>
      </div>
    </div>
  );
}

export type { TabId };
