// Site-wide constants. Edit before launch.

const GITHUB_ORG = 'MLSysDev';
const GITHUB_REPO = `${GITHUB_ORG}/mlsystems.dev`;
const X_HANDLE = 'MLSystemsDev';

// Social links. Set to null to render as a disabled "coming soon" icon.
export const SOCIALS: Record<'discord' | 'github' | 'twitter' | 'linkedin', string | null> = {
  discord: 'https://discord.gg/pxEvXN28tc',
  github: `https://github.com/${GITHUB_ORG}`,
  twitter: `https://x.com/${X_HANDLE}`,
  linkedin: 'https://www.linkedin.com/company/mlsystems-dev',
};

export const SITE = {
  name: 'ML Systems',
  domain: 'mlsystems.dev',
  url: 'https://mlsystems.dev',
  description:
    'Deep dives on machine learning systems: inference, training infrastructure, GPU memory, quantization, and LLM architecture — articles, primers, and case studies.',
  tagline: 'Machine learning, from kernels to clusters.',
  author: 'The ML Systems Community',
  twitter: `@${X_HANDLE}`,
  // GitHub identity — single source of truth for the org/repo and derived URLs.
  github: SOCIALS.github as string,
  org: GITHUB_ORG,
  repo: GITHUB_REPO,
  repoUrl: `https://github.com/${GITHUB_REPO}`,
  issuesUrl: `https://github.com/${GITHUB_REPO}/issues`,
  pullsUrl: `https://github.com/${GITHUB_REPO}/pulls`,
  discussionsUrl: `https://github.com/${GITHUB_REPO}/discussions`,
  orgDiscussionsUrl: `https://github.com/orgs/${GITHUB_ORG}/discussions`,
  pitchEmail: 'admin@mlsystems.dev',
  startYear: 2026,
  // Shows the "Post to GitHub" button in /write. Flip to true once the GitHub App
  // credentials are set in the Cloudflare Function env (see /api/create-pr).
  githubPostEnabled: true,
  // Shows the "Designed share card" opt-in under a cover in /write. Off by default;
  // set PUBLIC_OG_CARD_OPTIN=true to expose it. Opted-in posts render a per-post OG
  // card at build (a small build-time cost), so keep it off unless you want it.
  ogCardOptIn: import.meta.env.PUBLIC_OG_CARD_OPTIN === 'true',
};

export const APPEARANCE = {
  theme: 'light',
  accent: 'oxide',
  typeset: 'editorial',
  background: 'plain',
  density: 'comfortable',
} as const;
