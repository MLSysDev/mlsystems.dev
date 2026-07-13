'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TOPICS } from '@/lib/data';

type PagefindResultData = {
  url: string;
  excerpt: string;
  meta: { title?: string; topic?: string; date?: string; read?: string; authors?: string };
  sub_results?: { title: string; url: string; excerpt: string }[];
};

type PagefindResult = { id: string; data: () => Promise<PagefindResultData> };

type Pagefind = {
  debouncedSearch: (q: string) => Promise<{ results: PagefindResult[] } | null>;
  options: (o: Record<string, unknown>) => Promise<void>;
};

declare global {
  interface Window {
    __mlsPagefind?: Pagefind;
  }
}

async function loadPagefind(): Promise<Pagefind> {
  if (window.__mlsPagefind) return window.__mlsPagefind;
  const url = `${window.location.origin}/_pagefind/pagefind.js`;
  const mod = (await import(/* @vite-ignore */ url)) as Pagefind;
  await mod.options({ excerptLength: 24 });
  window.__mlsPagefind = mod;
  return mod;
}

type Group = 'topic' | 'article' | 'tool' | 'author' | 'page';

type RowItem = {
  group: Group;
  url: string;
  title: string;
  excerpt?: string;
  meta?: string;
};

function classifyUrl(url: string): Group {
  if (url.startsWith('/blog/')) return 'article';
  if (url.startsWith('/playground/')) return 'tool';
  if (url.startsWith('/authors/')) return 'author';
  return 'page';
}

const GROUP_LABEL: Record<Group, string> = {
  topic: 'Topics',
  article: 'Articles',
  tool: 'Tools',
  author: 'Authors',
  page: 'Pages',
};

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pageResults, setPageResults] = useState<PagefindResultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setPageResults([]);
    setActiveIdx(0);
  }, []);

  const topicMatches = useMemo<RowItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOPICS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
    )
      .slice(0, 3)
      .map((t) => ({
        group: 'topic' as const,
        url: `/blog?topic=${t.id}`,
        title: t.name,
        excerpt: t.desc,
      }));
  }, [query]);

  const rows = useMemo<RowItem[]>(() => {
    const fromPagefind: RowItem[] = pageResults.map((r) => ({
      group: classifyUrl(r.url),
      url: r.url,
      title: r.meta.title ?? r.url,
      excerpt: r.excerpt,
      meta: [r.meta.topic, r.meta.read].filter(Boolean).join(' · '),
    }));
    const merged = [...topicMatches, ...fromPagefind];
    const order: Group[] = ['topic', 'article', 'tool', 'author', 'page'];
    return merged.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  }, [topicMatches, pageResults]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === '/' && !open) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !t?.isContentEditable) {
          e.preventDefault();
          setOpen(true);
        }
      } else if (e.key === 'Escape' && open) {
        close();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    function onTrigger() {
      setOpen(true);
    }
    document.addEventListener('mls:open-search', onTrigger);
    return () => document.removeEventListener('mls:open-search', onTrigger);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setPageResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const pf = await loadPagefind();
        const res = await pf.debouncedSearch(query);
        if (cancelled || !res) return;
        const top = res.results.slice(0, 10);
        const data = await Promise.all(top.map((r) => r.data()));
        if (!cancelled) {
          setPageResults(data);
          setActiveIdx(0);
        }
      } catch {
        if (!cancelled) setPageResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  function onKeyInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && rows[activeIdx]) {
      e.preventDefault();
      window.location.href = rows[activeIdx].url;
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div className="search-modal" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" className="search-backdrop" aria-label="Close search" onClick={close} />
      <div className="search-panel">
        <div className="search-input-row">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m20 20-3.5-3.5"></path>
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyInput}
            placeholder="Search articles, topics, ideas…"
            aria-label="Search the archive"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="search-body">
          {!query && (
            <div className="search-empty search-hint">
              <div className="search-section">
                <div className="search-section-label">Browse by topic</div>
                <div className="search-topic-chips">
                  {TOPICS.map((t) => (
                    <a
                      key={t.id}
                      href={`/blog?topic=${t.id}`}
                      onClick={close}
                      className="chip chip--interactive"
                    >
                      {t.name}
                    </a>
                  ))}
                </div>
              </div>
              <div className="search-section">
                <div className="search-section-label">Try searching</div>
                <div className="search-hint-terms">
                  {['attention', 'quantization', 'vLLM', 'FSDP', 'evals'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuery(t)}
                      className="chip chip--interactive"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {query && loading && rows.length === 0 && <div className="search-empty">Searching…</div>}

          {query && !loading && rows.length === 0 && (
            <div className="search-empty">
              No matches for <strong>{query}</strong>.{' '}
              <a href="/blog" onClick={close}>
                Browse the archive →
              </a>
            </div>
          )}

          {rows.length > 0 && (
            <ul ref={listRef} className="search-results">
              {rows.map((row, i) => {
                const prev = rows[i - 1];
                const showHeader = !prev || prev.group !== row.group;
                return (
                  <li key={`${row.group}:${row.url}`} className={i === activeIdx ? 'active' : ''}>
                    {showHeader && (
                      <div className="search-group-label" aria-hidden="true">
                        {GROUP_LABEL[row.group]}
                      </div>
                    )}
                    <a href={row.url} onClick={close}>
                      {row.meta && (
                        <div className="search-result-meta">
                          <span>{row.meta}</span>
                        </div>
                      )}
                      <div
                        className="search-result-title"
                        dangerouslySetInnerHTML={{ __html: row.title }}
                      />
                      {row.excerpt && (
                        <div
                          className="search-result-excerpt"
                          dangerouslySetInnerHTML={{ __html: row.excerpt }}
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="search-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          <a href="/search" className="search-foot-link" onClick={close}>
            Full search →
          </a>
        </div>
      </div>
    </div>
  );
}
