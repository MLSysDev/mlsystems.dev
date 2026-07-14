export type PagefindResultData = {
  url: string;
  excerpt: string;
  meta: { title?: string; topic?: string; date?: string; read?: string; authors?: string };
  sub_results?: { title: string; url: string; excerpt: string }[];
};

export type PagefindResult = { id: string; data: () => Promise<PagefindResultData> };

export type Pagefind = {
  debouncedSearch: (q: string) => Promise<{ results: PagefindResult[] } | null>;
  options: (o: Record<string, unknown>) => Promise<void>;
};

export async function loadPagefind(): Promise<Pagefind> {
  if (window.__mlsPagefind) return window.__mlsPagefind;
  const url = `${window.location.origin}/_pagefind/pagefind.js`;
  const mod = (await import(/* @vite-ignore */ url)) as Pagefind;
  await mod.options({ excerptLength: 24 });
  window.__mlsPagefind = mod;
  return mod;
}
