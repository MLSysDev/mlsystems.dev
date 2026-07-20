'use client';

import { useEffect, useState } from 'react';
import { SITE } from '@/lib/site';

export default function ArticleActions({
  slug,
  title,
  author,
  date,
}: {
  slug: string;
  title: string;
  author: string;
  date: string;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const citation = `${author.split(' ').reverse().join(', ')}. "${title.split(':')[0]}." ${SITE.domain}, ${date}.`;

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(`${citation} ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  useEffect(() => {
    const key = `mlsys-liked-${slug}`;
    try {
      setLiked(localStorage.getItem(key) === '1');
    } catch {
      /* storage blocked */
    }
    let alive = true;
    fetch(`/api/likes/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: number } | null) => {
        if (alive && d && typeof d.count === 'number') setCount(d.count);
      })
      .catch(() => {
        /* no backend yet — keep the button working without a number */
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => (c === null ? c : Math.max(0, c + (next ? 1 : -1))));
    try {
      localStorage.setItem(`mlsys-liked-${slug}`, next ? '1' : '0');
    } catch {
      /* storage blocked */
    }
    try {
      const r = await fetch(`/api/likes/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: next ? 'like' : 'unlike' }),
      });
      if (r.ok) {
        const d = (await r.json()) as { count?: number };
        if (typeof d.count === 'number') setCount(d.count);
      }
    } catch {
      /* offline / no backend — optimistic state stays, nothing breaks */
    }
  };

  return (
    <div
      style={{
        maxWidth: 680,
        margin: '48px auto 0',
        padding: '0 24px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--line)',
        paddingTop: 24,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn"
          onClick={toggleLike}
          aria-pressed={liked}
          style={{
            color: liked ? 'var(--accent)' : 'inherit',
            borderColor: liked ? 'var(--accent)' : 'var(--line-2)',
          }}
        >
          {liked ? '♥' : '♡'}
          {count !== null && ` ${count}`}
        </button>
        <button
          className="btn"
          onClick={async () => {
            if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
            const url = window.location.href;
            const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
            if (typeof nav.share === 'function') {
              try {
                await nav.share({ title, url });
              } catch {
                /* user dismissed */
              }
              return;
            }
            if (nav.clipboard) {
              try {
                await nav.clipboard.writeText(url);
              } catch {
                /* clipboard blocked */
              }
            }
          }}
        >
          ↗ Share
        </button>
        <a
          className="btn"
          href={`/write?edit=${slug}`}
          title="Open this post in the editor to fix or improve it"
        >
          ✎ Improve
        </a>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--ink-3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <span>Cite as: {citation}</span>
        <button
          type="button"
          onClick={copyCitation}
          aria-label={copied ? 'Citation copied' : 'Copy citation with link'}
          title="Copy citation with link"
          style={{
            background: 'none',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            display: 'inline-flex',
            color: copied ? 'var(--accent)' : 'inherit',
          }}
        >
          {copied ? (
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
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
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
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
