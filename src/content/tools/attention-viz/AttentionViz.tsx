'use client';

import { useEffect, useState } from 'react';
import { Field } from '@/components/playground/primitives';
import { AttentionFig } from '@/components/HeroFigure';

function useAnimationFrame() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

export default function AttentionViz({ compact = false }: { compact?: boolean }) {
  const [model, setModel] = useState('llama-7b');
  const [layer, setLayer] = useState(14);
  const [head, setHead] = useState(3);
  const [prompt, setPrompt] = useState('The cat sat on the mat and the dog ran past him.');
  const t = useAnimationFrame();

  return (
    <div>
      {!compact && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                margin: 0,
                fontWeight: 400,
              }}
            >
              Attention Visualizer
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
              · LIVE
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>
            Inspect attention patterns for any model. Drag prompts in, scrub layers and heads.
          </p>
        </>
      )}
      <Field label="Model">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['llama-7b', 'llama-70b', 'mistral-7b', 'qwen-72b'].map((m) => (
            <button
              key={m}
              className={`filter-chip ${model === m ? 'active' : ''}`}
              onClick={() => setModel(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Field label="Layer" value={`${layer} / 32`}>
          <input
            type="range"
            min={0}
            max={31}
            value={layer}
            onChange={(e) => setLayer(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Head" value={`${head} / 32`}>
          <input
            type="range"
            min={0}
            max={31}
            value={head}
            onChange={(e) => setHead(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
      </div>
      <div style={{ marginTop: 16 }}>
        <Field label="Prompt">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--paper)',
              border: '1px solid var(--line-2)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--ink)',
            }}
          />
        </Field>
      </div>
      <div
        style={{
          marginTop: 24,
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          padding: 20,
          background: 'var(--paper)',
          height: 320,
        }}
      >
        <AttentionFig t={t + layer * 0.5 + head * 0.3} />
      </div>
    </div>
  );
}
