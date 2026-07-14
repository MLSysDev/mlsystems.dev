/// <reference types="astro/client" />

declare const __OG_VERSION__: string;

interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __mlsPagefind?: import('@/lib/pagefind').Pagefind;
}
