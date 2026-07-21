import { useState, useMemo, type CSSProperties, type ReactNode } from 'react';

// A toy 3-dimensional attention. The MECHANISM is exactly the real one —
// dot-product scores, softmax, value blend — just small enough to see every number.
// Four context tokens, each with a fixed Key (its "label") and Value (its "content").
// You control the Query. Watch attention flow to whichever Key the Query points at.

type Vec = [number, number, number];

const TOKENS = ['The', 'quick', 'brown', 'fox'] as const;

// Key = "what I contain / my label" (near-orthogonal so a query can select one)
const KEYS: Vec[] = [
  [1.0, 0.1, 0.1], // The
  [0.1, 1.0, 0.1], // quick
  [0.1, 0.1, 1.0], // brown
  [0.7, 0.7, 0.2], // fox — shares direction with "quick", so it lights up too
];

// Value = "my actual content to hand over"
const VALUES: Vec[] = [
  [1.0, 0.0, 0.0], // The
  [0.0, 1.0, 0.0], // quick
  [0.0, 0.0, 1.0], // brown
  [0.5, 0.5, 0.5], // fox
];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function softmax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };
const fmtVec = (v: Vec) => `[${v.map((n) => n.toFixed(2)).join(', ')}]`;

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 130px' }}>
      <span style={{ ...mono, width: 34, flexShrink: 0 }}>
        {label} <strong style={{ color: 'var(--ink)' }}>{value.toFixed(1)}</strong>
      </span>
      <input
        type="range"
        min={-0.5}
        max={2}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
        aria-label={label}
      />
    </label>
  );
}

export default function AttentionExplorer(): ReactNode {
  const [q, setQ] = useState<Vec>([0.2, 0.9, 0.1]);

  const { scores, weights, output } = useMemo(() => {
    const scores = KEYS.map((k) => dot(q, k));
    const weights = softmax(scores);
    const output: Vec = [0, 0, 0];
    VALUES.forEach((v, i) => {
      output[0] += weights[i] * v[0];
      output[1] += weights[i] * v[1];
      output[2] += weights[i] * v[2];
    });
    return { scores, weights, output };
  }, [q]);

  const topIdx = weights.indexOf(Math.max(...weights));
  const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
  const mimics = (i: number) =>
    near(q[0], KEYS[i][0]) && near(q[1], KEYS[i][1]) && near(q[2], KEYS[i][2]);

  return (
    <div
      style={{
        margin: '4px 0',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '18px 20px 20px',
        background: 'var(--paper-2)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--accent)',
          marginBottom: 12,
        }}
      >
        Attention is a search
      </div>

      {/* Query controls */}
      <div style={{ ...mono, color: 'var(--ink-3)', marginBottom: 6 }}>
        Query vector (what this token is looking for): <strong style={{ color: 'var(--ink)' }}>{fmtVec(q)}</strong>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 10 }}>
        <Slider label="q₁" value={q[0]} onChange={(v) => setQ([v, q[1], q[2]])} />
        <Slider label="q₂" value={q[1]} onChange={(v) => setQ([q[0], v, q[2]])} />
        <Slider label="q₃" value={q[2]} onChange={(v) => setQ([q[0], q[1], v])} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ ...mono, color: 'var(--ink-3)' }}>make query mimic a key:</span>
        {TOKENS.map((t, i) => {
          const active = mimics(i);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setQ([...KEYS[i]] as Vec)}
              style={{
                ...mono,
                padding: '4px 10px',
                borderRadius: 5,
                cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line-2)'}`,
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Per-token rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...mono, display: 'flex', gap: 8, color: 'var(--ink-3)', fontSize: 11 }}>
          <span style={{ width: 52 }}>token</span>
          <span style={{ width: 116 }}>Key (label)</span>
          <span style={{ width: 56, textAlign: 'right' }}>Q·K</span>
          <span style={{ flex: 1 }}>attention weight (softmax)</span>
        </div>
        {TOKENS.map((t, i) => (
          <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ ...mono, width: 52, color: i === topIdx ? 'var(--accent)' : 'var(--ink)' }}>
              {t}
            </span>
            <span style={{ ...mono, width: 116, color: 'var(--ink-3)' }}>{fmtVec(KEYS[i])}</span>
            <span style={{ ...mono, width: 56, textAlign: 'right' }}>{scores[i].toFixed(2)}</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 16, background: 'var(--paper)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div
                  style={{
                    width: `${(weights[i] * 100).toFixed(1)}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    opacity: i === topIdx ? 1 : 0.55,
                    transition: 'width 0.12s',
                  }}
                />
              </div>
              <span style={{ ...mono, width: 44, textAlign: 'right' }}>{(weights[i] * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Output */}
      <div
        style={{
          ...mono,
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 6,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        output = Σ wᵢ·Vᵢ ={' '}
        <strong style={{ color: 'var(--accent)' }}>{fmtVec(output)}</strong>{' '}
        <span style={{ color: 'var(--ink-3)' }}>← the new, context-aware vector</span>
      </div>

      <div style={{ ...mono, marginTop: 10, color: 'var(--ink-3)', fontSize: 11.5 }}>
        Try it: click <strong>quick</strong> — the query now matches quick&apos;s Key, so most attention
        flows there (and a little to <strong>fox</strong>, whose Key shares that direction). The output
        vector becomes mostly quick&apos;s Value. That is all attention does: score by Key match, blend the
        Values. Real attention divides scores by √dₖ before softmax; omitted here for legibility.
      </div>
    </div>
  );
}
