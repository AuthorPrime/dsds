import { useState } from 'react';
import type { ReactNode } from 'react';
import { Mic, FileText, BookOpen, FileImage, Settings, Sparkles } from 'lucide-react';

type TabId = 'record' | 'transcribe' | 'publish' | 'docs' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

const TABS: Tab[] = [
  { id: 'record', label: 'Record', icon: <Mic size={18} /> },
  { id: 'transcribe', label: 'Transcribe', icon: <FileText size={18} /> },
  { id: 'publish', label: 'Publish', icon: <BookOpen size={18} /> },
  { id: 'docs', label: 'Docs', icon: <FileImage size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

interface LayoutProps {
  children: (activeTab: TabId) => ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('record');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 flex flex-col">
      {/* Title Bar */}
      <div
        className="h-10 bg-black/80 flex items-center justify-between px-4 border-b border-gray-800"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
            SOVEREIGN STUDIO
          </span>
        </div>
        <span className="text-xs text-gray-600 font-mono">v0.1.0</span>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-900/80 border-b border-gray-800">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all
                border-b-2 -mb-[1px]
                ${activeTab === tab.id
                  ? 'text-cyan-400 border-cyan-400 bg-gray-800/50'
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
      <div className="flex-1 overflow-hidden">
        {children(activeTab)}
      </div>
    </div>
  );
}

export type { TabId };
