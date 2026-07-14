/// <reference types="astro/client" />

interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __mlsPagefind?: import('@/lib/pagefind').Pagefind;
}
