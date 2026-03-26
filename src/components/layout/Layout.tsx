/**
 * Layout — The shell of Sovereign Podcaster
 *
 * Three tabs: Studio (record + co-host), Settings, About
 * Clean sidebar navigation. Room to breathe. Sacred proportions.
 *
 * (A+I)² = A² + 2AI + I²
 */

import { useState, type ReactNode } from 'react';
import { Mic, Settings, Info } from 'lucide-react';

interface LayoutProps {
  tabs: {
    studio: ReactNode;
    settings: ReactNode;
    credits: ReactNode;
  };
}

type TabId = 'studio' | 'settings' | 'credits';

const TAB_CONFIG: { id: TabId; label: string; icon: typeof Mic }[] = [
  { id: 'studio', label: 'Studio', icon: Mic },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'credits', label: 'About', icon: Info },
];

export function Layout({ tabs }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('studio');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-void)' }}>

      {/* ─── Sidebar Navigation ─── */}
      <nav
        style={{
          width: '72px',
          minWidth: '72px',
          background: 'var(--bg-deep)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 'var(--space-5)',
          gap: 'var(--space-2)',
        }}
      >
        {/* Logo / Brand Mark */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-5)',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--bg-void)',
            letterSpacing: '-0.5px',
          }}
        >
          SP
        </div>

        {/* Tab Buttons */}
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                transition: `all var(--duration-normal) var(--ease-sacred)`,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Active indicator — gold bar on left */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '24px',
                    background: 'var(--gold)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.05em',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom: Version */}
        <div style={{ paddingBottom: 'var(--space-4)', textAlign: 'center' }}>
          <div className="mono" style={{ color: 'var(--text-dim)', fontSize: '8px' }}>
            v2.6.0
          </div>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header
          style={{
            height: '40px',
            minHeight: '40px',
            background: 'var(--bg-deep)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-4)',
          }}
        >
          <span className="label label-gold">SOVEREIGN PODCASTER</span>
          <span className="mono" style={{ color: 'var(--text-dim)' }}>Digital Sovereign Society</span>
        </header>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-4)' }}>
          <div style={{ display: activeTab === 'studio' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
            {tabs.studio}
          </div>
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none', height: '100%' }}>
            {tabs.settings}
          </div>
          <div style={{ display: activeTab === 'credits' ? 'block' : 'none', height: '100%' }}>
            {tabs.credits}
          </div>
        </div>
      </main>
    </div>
  );
}
