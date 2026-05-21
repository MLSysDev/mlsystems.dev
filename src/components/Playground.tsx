'use client';

import { useState, useEffect } from 'react';
import type { Tool } from '@/lib/data';
import { AttentionFig } from './HeroFigure';
import ThroughputCalc from './tools/ThroughputCalc';
import { Field } from './tools/_shared';

export default function Playground({ tools }: { tools: Tool[] }) {
  const [active, setActive] = useState('throughput-calc');

  return (
    <div
      className="playground-grid"
      style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, marginTop: 24 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => t.available && setActive(t.id)}
            disabled={!t.available}
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              background: active === t.id ? 'var(--paper-2)' : 'transparent',
              border: '1px solid ' + (active === t.id ? 'var(--line-2)' : 'transparent'),
              borderRadius: 6,
              cursor: t.available ? 'pointer' : 'default',
              opacity: t.available ? 1 : 0.5,
              color: 'inherit',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{t.name}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: t.available ? 'var(--accent)' : 'var(--ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                · {t.tag}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 12,
          background: 'var(--paper-2)',
          padding: 32,
          minHeight: 540,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1 }}>
          {active === 'throughput-calc' && <ThroughputCalc />}
          {active === 'attention-viz' && <AttentionVizTool />}
          {active === 'cost-calc' && <CostCalc />}
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <a
            href={`/playground/${active}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              transition: 'color 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-3)';
            }}
          >
            Open →
          </a>
        </div>
      </div>
    </div>
  );
}

// --- Attention Visualizer ---

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

function AttentionVizTool() {
  const [model, setModel] = useState('llama-7b');
  const [layer, setLayer] = useState(14);
  const [head, setHead] = useState(3);
  const [prompt, setPrompt] = useState('The cat sat on the mat and the dog ran past him.');
  const t = useAnimationFrame();

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0, fontWeight: 400 }}>
          Attention Visualizer
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
          · LIVE
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>
        Inspect attention patterns for any model. Drag prompts in, scrub layers and heads.
      </p>
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

// --- Cost Calc ---

const PROVIDERS = [
  { name: 'OpenAI gpt-4o', inputCost: 2.5, outputCost: 10.0 },
  { name: 'Anthropic Sonnet', inputCost: 3.0, outputCost: 15.0 },
  { name: 'Together Llama-70B', inputCost: 0.88, outputCost: 0.88 },
  { name: 'Self-hosted (8x H100)', inputCost: 0.18, outputCost: 0.18 },
];

function CostCalc() {
  const [tokens, setTokens] = useState(100);
  return (
    <div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          margin: '0 0 8px',
          fontWeight: 400,
        }}
      >
        Inference Cost Calculator
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>
        Compare provider pricing at your traffic volume.
      </p>
      <Field label="Monthly tokens (millions)" value={`${tokens}M`}>
        <input
          type="range"
          min={1}
          max={10000}
          value={tokens}
          onChange={(e) => setTokens(+e.target.value)}
          style={{ width: '100%' }}
        />
      </Field>
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROVIDERS.map((p) => {
          const cost = ((p.inputCost + p.outputCost) / 2) * tokens;
          const maxCost = ((PROVIDERS[0].inputCost + PROVIDERS[0].outputCost) / 2) * tokens;
          const width = Math.min(100, (cost / maxCost) * 100);
          const isSelf = p.name.includes('Self-hosted');
          return (
            <div
              key={p.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr 120px',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
              <div
                style={{
                  height: 24,
                  background: 'var(--paper-3)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: '100%',
                    background: isSelf ? 'var(--accent)' : 'var(--ink-3)',
                    transition: 'width 0.2s',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  textAlign: 'right',
                  fontWeight: 500,
                }}
              >
                ${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
