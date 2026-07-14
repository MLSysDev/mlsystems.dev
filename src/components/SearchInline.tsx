'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TOPICS } from '@/lib/data';
import { loadPagefind, type PagefindResultData } from '@/lib/pagefind';

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

function buildMeta(group: Group, meta: PagefindResultData['meta']): string {
  const parts: string[] = [];
  if (group === 'article') {
    if (meta.topic) parts.push(meta.topic);
    if (meta.read) parts.push(meta.read);
    if (meta.authors) parts.push(meta.authors);
  } else if (group === 'tool') {
    parts.push('Tool');
  } else if (group === 'author') {
    parts.push('Contributor');
  }
  return parts.join(' · ');
}

export default function SearchInline() {
  const [query, setQuery] = useState('');
  const [pageResults, setPageResults] = useState<PagefindResultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [indexAvailable, setIndexAvailable] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());
  }, [query]);

  const topicMatches = useMemo<RowItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOPICS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q),
    )
      .slice(0, 3)
      .map((t) => ({
        group: 'topic' as const,
        url: `/topics/${t.id}`,
        title: t.name,
        excerpt: t.desc,
      }));
  }, [query]);

  const rows = useMemo<RowItem[]>(() => {
    const fromPagefind: RowItem[] = pageResults.map((r) => {
      const g = classifyUrl(r.url);
      return {
        group: g,
        url: r.url,
        title: r.meta.title ?? r.url,
        excerpt: r.excerpt,
        meta: buildMeta(g, r.meta),
      };
    });
    const merged = [...topicMatches, ...fromPagefind];
    const order: Group[] = ['topic', 'article', 'tool', 'author', 'page'];
    return merged.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  }, [topicMatches, pageResults]);

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
        const top = res.results.slice(0, 20);
        const data = await Promise.all(top.map((r) => r.data()));
        if (!cancelled) {
          setPageResults(data);
          setActiveIdx(0);
        }
      } catch {
        if (!cancelled) {
          setPageResults([]);
          setIndexAvailable(false);
        }
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

  return (
    <div className="search-inline">
      <div className="search-inline-input-row">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
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
            className="search-inline-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="search-inline-body">
        {!query && (
          <div className="search-empty search-hint">
            <div className="search-section">
              <div className="search-section-label">Browse by topic</div>
              <div className="search-topic-chips">
                {TOPICS.map((t) => (
                  <a key={t.id} href={`/topics/${t.id}`} className="chip chip--interactive">
                    {t.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="search-section">
              <div className="search-section-label">Try searching</div>
              <div className="search-hint-terms">
                {['attention', 'quantization', 'vLLM', 'FSDP', 'evals', 'agents'].map((t) => (
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

        {query && !indexAvailable && (
          <div className="search-empty">
            Search index isn't loaded yet. Run <code>npm run index:dev</code> (for dev) or{' '}
            <code>npm run build</code> (for production), then reload.
          </div>
        )}

        {query && indexAvailable && loading && rows.length === 0 && (
          <div className="search-empty">Searching…</div>
        )}

        {query && indexAvailable && !loading && rows.length === 0 && (
          <div className="search-empty">
            No matches for <strong>{query}</strong>. <a href="/blog">Browse the archive →</a>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="search-inline-count">
              {rows.length} {rows.length === 1 ? 'result' : 'results'} for <strong>{query}</strong>
            </div>
            <ul ref={listRef} className="search-results search-results-page">
              {rows.map((row, i) => {
                const prev = rows[i - 1];
                const showHeader = !prev || prev.group !== row.group;
                return (
                  <li key={`${row.group}:${row.url}`} className={i === activeIdx ? 'active' : ''}>
                    {showHeader && (
                      <div className="search-group-label">{GROUP_LABEL[row.group]}</div>
                    )}
                    <a href={row.url}>
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
                      {row.meta && <div className="search-result-meta-line">{row.meta}</div>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
