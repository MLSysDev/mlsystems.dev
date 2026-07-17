/// <reference types="astro/client" />

declare const __OG_VERSION__: string;

interface ImportMetaEnv {
  // Build-time token for reading GitHub Discussions into the forum (optional).
  readonly GITHUB_TOKEN?: string;
  readonly GH_TOKEN?: string;
}

interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __mlsPagefind?: import('@/lib/pagefind').Pagefind;
}
