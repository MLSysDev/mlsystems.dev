import { useState, type CSSProperties } from 'react';

const PROMPT = ['Convert', 'to', 'JSON', ':', 'Ava', 'Kim', ',', '41', ',', 'People', 'Ops'];
const COMPLETION = ['{', '"name"', ':', '"Ava Kim"', ',', '"age"', ':', '41', '}', '<eos>'];

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

function Chip({ tok, scored, eos }: { tok: string; scored: boolean; eos?: boolean }) {
  return (
    <span
      style={{
        ...mono,
        fontSize: 12,
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${scored ? 'var(--accent)' : 'var(--line-2)'}`,
        background: scored ? 'var(--accent-soft)' : 'transparent',
        color: scored ? 'var(--accent)' : 'var(--ink-3)',
        whiteSpace: 'nowrap',
        opacity: scored ? 1 : 0.7,
        fontWeight: eos && scored ? 700 : 400,
      }}
    >
      {tok}
    </span>
  );
}

export default function LossMaskStrip() {
  const [completionOnly, setCompletionOnly] = useState(true);
  const total = PROMPT.length + COMPLETION.length;
  const scored = completionOnly ? COMPLETION.length : total;
  const pct = Math.round((COMPLETION.length / total) * 100);

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '18px 20px', background: 'var(--paper-2)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setCompletionOnly((v) => !v)}
          style={{
            ...mono,
            padding: '5px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            border: `1px solid ${completionOnly ? 'var(--accent)' : 'var(--line-2)'}`,
            background: completionOnly ? 'var(--accent-soft)' : 'transparent',
            color: completionOnly ? 'var(--accent)' : 'var(--ink-2)',
          }}
        >
          loss: {completionOnly ? 'completion-only (masked)' : 'all tokens (unmasked)'}
        </button>
        <span style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)' }}>
          scored on {scored} / {total} tokens
        </span>
      </div>

      <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>prompt (the input — given)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {PROMPT.map((tok, i) => (
          <Chip key={`p-${i}`} tok={tok} scored={!completionOnly} />
        ))}
      </div>

      <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 6 }}>completion (the target — always scored)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {COMPLETION.map((tok, i) => (
          <Chip key={`c-${i}`} tok={tok} scored eos={tok === '<eos>'} />
        ))}
      </div>

      <div style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 16 }}>
        {completionOnly ? (
          <>
            Prompt tokens have <strong>label = −100</strong> — seen as context, never scored. All {COMPLETION.length} completion tokens
            (including <strong>&lt;eos&gt;</strong>, so it learns to stop) drive the loss.
          </>
        ) : (
          <>
            Every token is scored — so {100 - pct}% of the gradient is spent learning to <em>regenerate the instruction</em>, diluting the
            signal for the JSON you actually care about.
          </>
        )}
      </div>
    </div>
  );
}
