/**
 * Sovereign Studio - Branding & Identity
 *
 * APP_BRAND: Static app-level branding (name, version, colors).
 * getUserBranding(): Dynamic user-facing branding read from localStorage settings.
 *
 * DSS/FractalNode/MPL details are intentionally kept OUT of this module.
 * They live only in CreditsTab.tsx (About page).
 */

import { getSettings } from './hooks/useSettings';

// ─── Static App Brand (never changes) ───────────────────────────────
export const APP_BRAND = {
  name: 'Sovereign Studio',
  tagline: 'Record. Create. Publish. Sovereign.',
  version: '2.4.0',

  colors: {
    primary: '#8B5CF6',       // Purple - sovereignty
    secondary: '#06B6D4',     // Cyan - technology
    accent: '#F59E0B',        // Amber - warmth
    success: '#10B981',       // Emerald - growth
    danger: '#EF4444',        // Red - alerts
    background: '#0A0A0F',    // Near-black
    surface: '#111118',       // Dark surface
    surfaceLight: '#1A1A24',  // Lighter surface
    border: '#2A2A3A',        // Subtle border
    text: '#E2E8F0',          // Light text
    textMuted: '#94A3B8',     // Muted text
    gradient: {
      primary: 'from-purple-500 via-violet-500 to-cyan-500',
      warm: 'from-amber-500 via-orange-500 to-purple-500',
      cool: 'from-cyan-500 via-blue-500 to-purple-500',
    },
  },
} as const;

// ─── Dynamic User Branding ──────────────────────────────────────────
export interface UserBranding {
  podcastName: string;
  hostName: string;
  organizationName: string;
  websiteUrl: string;
  /** Short org abbreviation, e.g. "DSS" from "Digital Sovereign Society" */
  orgAbbreviation: string;
}

/**
 * Read the user's branding fields from persisted settings.
 * Falls back to generic defaults so the app always works.
 */
export function getUserBranding(): UserBranding {
  const s = getSettings();
  const orgName = s.organizationName || '';
  return {
    podcastName: s.podcastName || 'My Podcast',
    hostName: s.hostName || 'Host',
    organizationName: orgName,
    websiteUrl: s.websiteUrl || '',
    orgAbbreviation: orgName
      ? orgName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4)
      : '',
  };
}

// Keep BRANDING as a lightweight alias so existing imports that use
// BRANDING.colors still work during migration without a huge diff.
export const BRANDING = {
  app: APP_BRAND,
  colors: APP_BRAND.colors,
} as const;
