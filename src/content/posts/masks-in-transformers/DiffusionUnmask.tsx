import { useEffect, useState, type CSSProperties } from 'react';

const PROMPT = ['Convert', 'to', 'JSON', ':', 'Ava', ',', '41'];
// target tokens + the diffusion step at which each is revealed (structure first,
// values last — deliberately NOT left-to-right, to show parallel denoising).
const TARGET: { tok: string; step: number }[] = [
  { tok: '{', step: 1 },
  { tok: '"name"', step: 2 },
  { tok: ':', step: 3 },
  { tok: '"Ava"', step: 2 },
  { tok: ',', step: 4 },
  { tok: '"age"', step: 1 },
  { tok: ':', step: 3 },
  { tok: '41', step: 4 },
  { tok: '}', step: 1 },
];
const STEPS = 4;

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

export default function DiffusionUnmask() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep((s) => (s >= STEPS ? s : s + 1)), 720);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (step >= STEPS) setPlaying(false);
  }, [step]);

  const revealed = TARGET.filter((t) => t.step <= step).length;

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '18px 20px', background: 'var(--paper-2)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => {
            if (step >= STEPS) setStep(0);
            setPlaying((p) => !p);
          }}
          style={{ ...mono, padding: '6px 16px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {playing ? '❚❚ pause' : step >= STEPS ? '↻ replay' : '▶ denoise'}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          style={{ ...mono, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--ink-2)' }}
        >
          reset
        </button>
        <span style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 'auto' }}>
          step {step} / {STEPS} · {revealed}/{TARGET.length} unmasked
        </span>
      </div>

      <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>prompt (never masked)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {PROMPT.map((tok, i) => (
          <span key={`p-${i}`} style={{ ...mono, padding: '4px 8px', borderRadius: 5, border: '1px solid var(--line-2)', color: 'var(--ink-2)' }}>
            {tok}
          </span>
        ))}
      </div>

      <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 6 }}>completion (starts fully masked, unmasked in parallel)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TARGET.map((t, i) => {
          const shown = t.step <= step;
          return (
            <span
              key={`t-${i}`}
              style={{
                ...mono,
                minWidth: 24,
                textAlign: 'center',
                padding: '4px 8px',
                borderRadius: 5,
                border: `1px solid ${shown ? 'var(--accent)' : 'var(--line-2)'}`,
                borderStyle: shown ? 'solid' : 'dashed',
                background: shown ? 'var(--accent-soft)' : 'var(--paper)',
                color: shown ? 'var(--accent)' : 'var(--ink-3)',
                transition: 'all 160ms',
              }}
            >
              {shown ? t.tok : '▨'}
            </span>
          );
        })}
      </div>

      <div style={{ ...mono, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 16 }}>
        A masked <strong>diffusion</strong> LM starts from an all-<strong>▨</strong> completion and unmasks positions <em>in parallel</em>,
        coarse-to-fine — not one token left-to-right. The prompt is held fixed the whole time (it is the part that is never masked).
      </div>
    </div>
  );
}
