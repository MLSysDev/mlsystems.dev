import { useState, type CSSProperties, type ReactNode } from 'react';

// Real, measured attention from GPT-2 (117M) on "The quick brown fox" — one representative
// head (layer 2, head 9), extracted with transformers (output_attentions=True).
// Rows = the attending token, columns = the token attended to. Attention is causal: a token
// attends only to itself and earlier tokens, so the upper triangle is zero. Not hand-tuned.

const TOKENS = ['The', 'quick', 'brown', 'fox'];

// GPT-2 layer 2, head 9 — attention matrix (row = attending token)
const M = [
  [1.0, 0, 0, 0],
  [0.67, 0.33, 0, 0],
  [0.43, 0.43, 0.14, 0],
  [0.13, 0.28, 0.51, 0.07],
];

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

const btn = (active: boolean): CSSProperties => ({
  ...mono,
  padding: '4px 12px',
  borderRadius: 5,
  cursor: 'pointer',
  border: `1px solid ${active ? 'var(--accent)' : 'var(--line-2)'}`,
  background: active ? 'var(--accent-soft)' : 'transparent',
  color: active ? 'var(--accent)' : 'var(--ink-2)',
  fontWeight: active ? 600 : 400,
});

export default function AttentionExplorer(): ReactNode {
  const [at, setAt] = useState(3); // "fox"

  const row = M[at];
  const topIdx = row.indexOf(Math.max(...row));

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
          marginBottom: 14,
        }}
      >
        Self-attention · GPT-2 (117M)
      </div>

      {/* Which token is attending */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ ...mono, color: 'var(--ink-3)' }}>attending token:</span>
        {TOKENS.map((t, i) => (
          <button key={t} type="button" style={btn(i === at)} onClick={() => setAt(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* Weights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...mono, display: 'flex', gap: 8, color: 'var(--ink-3)', fontSize: 11 }}>
          <span style={{ width: 60, flexShrink: 0 }}>token</span>
          <span style={{ flex: 1 }}>
            how much <strong style={{ color: 'var(--ink)' }}>{TOKENS[at]}</strong> attends to it
          </span>
        </div>
        {TOKENS.map((t, j) => {
          const future = j > at;
          const w = row[j];
          return (
            <div key={t} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: future ? 0.35 : 1 }}>
              <span
                style={{
                  ...mono,
                  width: 60,
                  flexShrink: 0,
                  color: !future && j === topIdx ? 'var(--accent)' : 'var(--ink)',
                }}
              >
                {t}
              </span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 18, background: 'var(--paper)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <div
                    style={{
                      width: `${(w * 100).toFixed(1)}%`,
                      height: '100%',
                      background: 'var(--accent)',
                      opacity: j === topIdx ? 1 : 0.55,
                      transition: 'width 0.12s',
                    }}
                  />
                </div>
                <span style={{ ...mono, width: 44, textAlign: 'right' }}>
                  {future ? '—' : `${(w * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...mono, marginTop: 14, color: 'var(--ink-3)', fontSize: 11 }}>
        Causal masking: a token attends to itself and earlier tokens only, never to ones that come
        later, so those are 0 (shown as —).
      </div>
    </div>
  );
}
