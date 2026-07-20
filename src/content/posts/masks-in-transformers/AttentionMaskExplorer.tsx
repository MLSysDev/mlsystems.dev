import { useState, type CSSProperties } from 'react';

const N = 8;
const CELL = 30;
const GX = 44; // grid left offset (row labels)
const GY = 46; // grid top offset (col labels)
const PAD_FROM = 6; // tokens 6,7 are padding
const PREFIX_K = 4; // first 4 tokens are the bidirectional prefix
const WINDOW = 4; // sliding-window width
const DOC_SPLIT = 4; // packed: doc A = 0..3, doc B = 4..7

type Mode = 'causal' | 'bidirectional' | 'window' | 'padding' | 'prefix' | 'packed';

const MODES: { id: Mode; label: string; rule: string; where: string }[] = [
  {
    id: 'causal',
    label: 'causal',
    rule: 'attend(i, j) = j ≤ i',
    where: 'Decoder-only LMs (GPT, Llama, Qwen) — the default. A token sees only the past, so training in parallel matches left-to-right generation.',
  },
  {
    id: 'bidirectional',
    label: 'bidirectional',
    rule: 'attend(i, j) = always',
    where: 'Encoders (BERT). Every token sees every other — ideal for understanding, unusable for open-ended generation.',
  },
  {
    id: 'window',
    label: 'sliding window',
    rule: `attend(i, j) = 0 ≤ i − j < ${WINDOW}`,
    where: 'Local attention (Mistral, Longformer). Cost falls from O(n²) to O(n·w); long-range information hops across layers.',
  },
  {
    id: 'padding',
    label: 'padding',
    rule: 'causal, and pad tokens are never attended to',
    where: 'Batching uneven lengths. The short sequences are padded; those pad columns are masked so real tokens ignore the filler.',
  },
  {
    id: 'prefix',
    label: 'prefix-LM',
    rule: `attend(i, j) = (j ≤ i) OR (j < ${PREFIX_K})`,
    where: 'T5 decoder input, UL2 S-denoiser. The prompt/prefix is bidirectional; the generated part stays causal.',
  },
  {
    id: 'packed',
    label: 'packed docs',
    rule: 'attend(i, j) = (j ≤ i) AND same document',
    where: 'Sequence packing. Several examples share one sequence; a block-diagonal mask stops cross-contamination (FlashAttention varlen).',
  },
];

function allowed(mode: Mode, i: number, j: number): boolean {
  switch (mode) {
    case 'bidirectional':
      return true;
    case 'causal':
      return j <= i;
    case 'window':
      return j <= i && i - j < WINDOW;
    case 'padding':
      return j <= i && i < PAD_FROM && j < PAD_FROM;
    case 'prefix':
      return j <= i || j < PREFIX_K;
    case 'packed':
      return j <= i && (i < DOC_SPLIT) === (j < DOC_SPLIT);
  }
}

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

export default function AttentionMaskExplorer() {
  const [mode, setMode] = useState<Mode>('causal');
  const active = MODES.find((m) => m.id === mode)!;
  const W = GX + N * CELL + 6;
  const H = GY + N * CELL + 6;

  const headColor = (k: number): string => {
    if (mode === 'padding' && k >= PAD_FROM) return 'var(--ink-3)';
    if (mode === 'prefix' && k < PREFIX_K) return 'var(--accent)';
    return 'var(--ink-2)';
  };

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '18px 20px', background: 'var(--paper-2)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            style={{
              ...mono,
              padding: '5px 11px',
              borderRadius: 5,
              cursor: 'pointer',
              border: `1px solid ${m.id === mode ? 'var(--accent)' : 'var(--line-2)'}`,
              background: m.id === mode ? 'var(--accent-soft)' : 'transparent',
              color: m.id === mode ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 240, maxWidth: 360 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'var(--font-mono)' }} role="img" aria-label={`Attention mask matrix for ${active.label} masking. A filled cell means the query row may attend to the key column.`}>
            <text x={GX + (N * CELL) / 2} y={14} fontSize="10" textAnchor="middle" fill="var(--ink-3)">
              key j  (attended to) →
            </text>
            <text x={12} y={GY + (N * CELL) / 2} fontSize="10" textAnchor="middle" fill="var(--ink-3)" transform={`rotate(-90 12 ${GY + (N * CELL) / 2})`}>
              query i  (attending) →
            </text>

            {Array.from({ length: N }).map((_, k) => (
              <text key={`col-${k}`} x={GX + k * CELL + CELL / 2} y={GY - 8} fontSize="10.5" textAnchor="middle" fill={headColor(k)}>
                {k}
              </text>
            ))}
            {Array.from({ length: N }).map((_, k) => (
              <text key={`row-${k}`} x={GX - 9} y={GY + k * CELL + CELL / 2 + 3.5} fontSize="10.5" textAnchor="end" fill={headColor(k)}>
                {k}
              </text>
            ))}

            {Array.from({ length: N }).map((_, i) =>
              Array.from({ length: N }).map((__, j) => {
                const on = allowed(mode, i, j);
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={GX + j * CELL + 1.5}
                    y={GY + i * CELL + 1.5}
                    width={CELL - 3}
                    height={CELL - 3}
                    rx={3}
                    fill={on ? 'var(--accent)' : 'var(--ink)'}
                    opacity={on ? 0.82 : 0.07}
                    stroke={i === j ? 'var(--accent)' : 'none'}
                    strokeWidth={i === j ? 1.2 : 0}
                    strokeOpacity={0.5}
                  />
                );
              }),
            )}

            {mode === 'packed' && (
              <g stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7">
                <line x1={GX + DOC_SPLIT * CELL} y1={GY} x2={GX + DOC_SPLIT * CELL} y2={GY + N * CELL} />
                <line x1={GX} y1={GY + DOC_SPLIT * CELL} x2={GX + N * CELL} y2={GY + DOC_SPLIT * CELL} />
              </g>
            )}
            {mode === 'padding' && (
              <line x1={GX + PAD_FROM * CELL} y1={GY} x2={GX + PAD_FROM * CELL} y2={GY + N * CELL} stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
            )}
          </svg>
        </div>

        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 6 }}>{active.label}</div>
          <div style={{ ...mono, color: 'var(--ink)', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>{active.rule}</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>{active.where}</div>
          {mode === 'packed' && <div style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>Dashed line = document boundary (tokens 0–3 vs 4–7).</div>}
          {mode === 'padding' && <div style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>Tokens 6–7 are padding (greyed) — masked out.</div>}
          {mode === 'prefix' && <div style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>Tokens 0–3 (accent) are the prefix — attended by everyone.</div>}
        </div>
      </div>
    </div>
  );
}
