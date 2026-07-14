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
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
        Cite as: {author.split(' ').reverse().join(', ')}. &quot;{title.split(':')[0]}.&quot;{' '}
        {SITE.domain}, {date}.
      </div>
    </div>
  );
}
