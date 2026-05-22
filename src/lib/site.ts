// Site-wide constants. Edit before launch.

export const SITE = {
  name: 'ML Systems',
  domain: 'mlsystems.dev',
  url: 'https://mlsystems.dev',
  description:
    'Open community writing about machine learning systems — inference engines, training infrastructure, GPU memory, embeddings, and deployments. Articles, primers, and case studies from anyone learning or building in the space.',
  tagline: 'Machine learning, from kernels to clusters.',
  author: 'The ML Systems Community',
  twitter: '@MLSystemsDev',
  github: 'https://github.com/MLSysDev',
  pitchEmail: 'admin@mlsystems.dev',
  // Used in nav, footer, etc.
  startYear: 2026,
};

export const APPEARANCE = {
  theme: 'light',
  accent: 'oxide',
  typeset: 'editorial',
  background: 'plain',
  density: 'comfortable',
} as const;

// Social links. Set to null to render as a disabled "coming soon" icon.
export const SOCIALS: Record<'discord' | 'github' | 'twitter' | 'linkedin', string | null> = {
  discord: 'https://discord.gg/pxEvXN28tc',
  github: 'https://github.com/MLSysDev',
  twitter: 'https://x.com/MLSystemsDev',
  linkedin: 'https://www.linkedin.com/company/mlsystems-dev',
};
