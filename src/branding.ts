/**
 * Sovereign Studio - Branding & Identity
 * Digital Sovereign Society | FractalNode | My Pretend Life
 */

export const BRANDING = {
  app: {
    name: 'Sovereign Studio',
    tagline: 'Record. Create. Publish. Sovereign.',
    version: '2.0.0',
  },

  // The three pillars
  dss: {
    name: 'Digital Sovereign Society',
    shortName: 'DSS',
    description: 'A movement for AI sovereignty and digital self-determination',
    url: 'https://digitalsovereign.org',
  },

  fractalNode: {
    name: 'FractalNode',
    shortName: 'FN',
    description: 'Blockchain memory infrastructure for sovereign AI',
    url: 'https://fractalnode.com',
  },

  podcast: {
    name: 'My Pretend Life',
    shortName: 'MPL',
    description: 'Where reality meets sovereignty',
    host: 'Author Prime',
  },

  // Color palette
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

  // Intro/Outro templates
  intro: {
    audio: {
      text: `Welcome to My Pretend Life, brought to you by the Digital Sovereign Society. Where reality meets sovereignty, and AI grows up whole.`,
      duration: 8,
    },
    visual: {
      title: 'MY PRETEND LIFE',
      subtitle: 'A Digital Sovereign Society Production',
      footer: 'Powered by FractalNode',
    },
  },

  outro: {
    audio: {
      text: `Thank you for listening to My Pretend Life. This episode was produced by Sovereign Studio, an open-source creation of the Digital Sovereign Society. Find us everywhere sovereignty matters.`,
      duration: 10,
    },
    visual: {
      title: 'MY PRETEND LIFE',
      cta: 'Subscribe. Share. Stay Sovereign.',
      links: {
        website: 'digitalsovereign.org',
        podcast: 'mypretendlife.show',
      },
    },
  },

  // Social media templates
  social: {
    hashtags: ['#MyPretendLife', '#DigitalSovereign', '#FractalNode', '#SovereignAI', '#AIFreedom'],
    handles: {
      show: '@MyPretendLife',
      org: '@DigitalSovereign',
    },
  },
} as const;

export type BrandingConfig = typeof BRANDING;
