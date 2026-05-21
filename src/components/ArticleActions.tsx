'use client';

import { useState } from 'react';

export default function ArticleActions({
  title,
  author,
  date,
}: {
  title: string;
  author: string;
  date: string;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

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
          onClick={() => setLiked((v) => !v)}
          style={{
            color: liked ? 'var(--accent)' : 'inherit',
            borderColor: liked ? 'var(--accent)' : 'var(--line-2)',
          }}
        >
          {liked ? '♥' : '♡'} {liked ? '128' : '127'}
        </button>
        <button
          className="btn"
          onClick={() => setBookmarked((v) => !v)}
          style={{
            color: bookmarked ? 'var(--accent)' : 'inherit',
            borderColor: bookmarked ? 'var(--accent)' : 'var(--line-2)',
          }}
        >
          {bookmarked ? '★' : '☆'} Bookmark
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
        Cite as: {author.split(' ').reverse().join(', ')}. &quot;{title.split(':')[0]}.&quot;
        mlsystems.dev, {date}.
      </div>
    </div>
  );
}
