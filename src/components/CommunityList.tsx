'use client';

import { useState, useMemo } from 'react';
import type { Thread } from '@/lib/data';

export default function CommunityList({ threads }: { threads: Thread[] }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'replies'>('recent');

  const categories = useMemo(() => [...new Set(threads.map((t) => t.category))], [threads]);

  const filtered = useMemo(() => {
    let list = threads;
    if (activeCategory !== 'all') list = list.filter((t) => t.category === activeCategory);
    if (sortBy === 'replies') list = [...list].sort((a, b) => b.replies - a.replies);
    return list;
  }, [threads, activeCategory, sortBy]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div className="blog-filters">
          <button className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} className={`filter-chip ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          <span>sort:</span>
          <button className={`filter-chip ${sortBy === 'recent' ? 'active' : ''}`} onClick={() => setSortBy('recent')}>recent</button>
          <button className={`filter-chip ${sortBy === 'replies' ? 'active' : ''}`} onClick={() => setSortBy('replies')}>most replies</button>
        </div>
      </div>

      <div className="thread-list">
        {filtered.map((th) => (
          <div key={th.id} className="thread-row">
            <div className="thread-icon">{th.author.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="thread-title">{th.title}</div>
              <div className="thread-meta">
                @{th.author} · {th.category} · last reply {th.lastReply}
              </div>
            </div>
            <div className="thread-replies">
              {th.replies}
              <small>replies</small>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: 24, border: '1px dashed var(--line-2)', borderRadius: 8, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
        That&apos;s all for now.{' '}
        <a href="/contribute" style={{ color: 'var(--accent)' }}>
          Start a thread →
        </a>
      </div>
    </div>
  );
}
