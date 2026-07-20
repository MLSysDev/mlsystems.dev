import { useState, type CSSProperties } from 'react';

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

const PRESETS = [
  { label: 'toy · 4', d: 4 },
  { label: 'GPT-2 · 768', d: 768 },
  { label: 'small · 2048', d: 2048 },
  { label: 'Llama attn · 4096', d: 4096 },
];

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function Bar({ label, value, frac, accent }: { label: string; value: number; frac: number; accent: boolean }) {
  const pct = Math.min(100, Math.max(1.5, frac * 100));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: accent ? 'var(--accent)' : 'var(--ink-2)' }}>{fmt(value)} params</span>
      </div>
      <div style={{ height: 14, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: accent ? 'var(--accent)' : 'var(--line-2)' }} />
      </div>
    </div>
  );
}

export default function LoRABudget() {
  const [d, setD] = useState(4096);
  const [r, setR] = useState(16);

  const clampedR = Math.min(r, d);
  const full = d * d;
  const lora = 2 * clampedR * d;
  const breakEven = d / 2;
  const ratio = full / lora; // = d / (2r)
  const saves = clampedR < breakEven;

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '18px 20px 20px', background: 'var(--paper-2)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ ...mono, color: 'var(--ink-3)' }}>weight matrix (d × d)</span>
        {PRESETS.map((p) => (
          <button
            key={p.d}
            type="button"
            onClick={() => setD(p.d)}
            style={{
              ...mono,
              padding: '4px 10px',
              borderRadius: 5,
              cursor: 'pointer',
              border: `1px solid ${p.d === d ? 'var(--accent)' : 'var(--line-2)'}`,
              background: p.d === d ? 'var(--accent-soft)' : 'transparent',
              color: p.d === d ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ ...mono, width: 88, flexShrink: 0 }}>
          rank r <strong style={{ color: 'var(--ink)' }}>{clampedR}</strong>
        </span>
        <input
          type="range"
          min={1}
          max={Math.max(2, d)}
          step={1}
          value={clampedR}
          onChange={(e) => setR(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
          aria-label="rank r"
        />
      </label>

      <Bar label="full ΔW  =  d × d" value={full} frac={1} accent={false} />
      <Bar label="LoRA  =  2 · r · d" value={lora} frac={lora / full} accent />

      <div style={{ ...mono, marginTop: 14, padding: '10px 14px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line)' }}>
        d = {d}, r = {clampedR} → full = {fmt(full)}, LoRA = {fmt(lora)}.{' '}
        {saves ? (
          <>
            LoRA is <strong style={{ color: 'var(--accent)' }}>{ratio.toFixed(1)}× smaller</strong>.
          </>
        ) : (
          <>
            <strong style={{ color: 'var(--ink)' }}>No saving</strong> — at r ≥ d/2 the full update is as cheap or cheaper.
          </>
        )}
      </div>
    </div>
  );
}
