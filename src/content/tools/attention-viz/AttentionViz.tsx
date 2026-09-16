'use client';

import { useEffect, useState } from 'react';
import { AttentionFig } from '@/components/HeroFigure';

export default function AttentionViz() {
  const [t, setT] = useState(5);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      setReducedMotion(query.matches);
      if (query.matches || paused) return;
      const start = performance.now();
      const tick = (now: number) => {
        setT((now - start) / 1000);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    update();
    query.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener('change', update);
    };
  }, [paused]);

  return (
    <div>
      <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.65 }}>
        An illustrative attention map for a fixed sentence. These patterns are synthetic; no model
        is loaded and no prompt is sent to a server.
      </p>
      {!reducedMotion && (
        <button className="filter-chip" onClick={() => setPaused(!paused)} aria-pressed={paused}>
          {paused ? 'Play animation' : 'Pause animation'}
        </button>
      )}
      <div
        role="img"
        aria-label="Synthetic causal attention map, with earlier tokens visible to later tokens"
        style={{
          marginTop: 24,
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          padding: 20,
          background: 'var(--paper)',
          height: 360,
        }}
      >
        <AttentionFig t={t} />
      </div>
    </div>
  );
}
