import { useState, type CSSProperties } from 'react';

const N = 14;
const CELL = 18; // grid pitch (gap between cells = CELL - DOT)
const DOT = 14; // drawn cell size → 4px of breathing room between cells

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };
const label: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--ink-3)',
};

// A structured target matrix = sum of N rank-1 outer products with fast-decaying
// weights (stand-ins for singular values). Orthogonal cosine bases make this behave
// like a real SVD: the first few ranks carry almost all the energy — LoRA's bet.
function basis(freq: number, size: number): number[] {
  const v: number[] = [];
  for (let k = 0; k < size; k++) v.push(Math.cos((freq * Math.PI * (k + 0.5)) / size));
  return v;
}
const SIGMA = Array.from({ length: N }, (_, i) => Math.pow(0.5, i));
const U = Array.from({ length: N }, (_, i) => basis(i + 1, N));
const V = Array.from({ length: N }, (_, i) => basis(i + 1, N));

function reconstruct(rank: number): number[][] {
  const M: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < rank; i++) {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) M[x][y] += SIGMA[i] * U[i][x] * V[i][y];
    }
  }
  return M;
}

const TARGET = reconstruct(N);
const MAXABS = Math.max(...TARGET.flat().map((v) => Math.abs(v)));
const TOTAL_ENERGY = SIGMA.reduce((s, v) => s + v * v, 0);

function energyCaptured(rank: number): number {
  let e = 0;
  for (let i = 0; i < rank; i++) e += SIGMA[i] * SIGMA[i];
  return e / TOTAL_ENERGY;
}

function Heat({ M, title }: { M: number[][]; title: string }) {
  const size = N * CELL;
  return (
    <div style={{ flex: '1 1 40%', minWidth: 140, maxWidth: 320 }}>
      <div style={{ ...label, marginBottom: 8 }}>{title}</div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={title}
      >
        {M.map((row, x) =>
          row.map((val, y) => {
            const mag = Math.min(1, Math.abs(val) / MAXABS);
            return (
              <rect
                key={`${x}-${y}`}
                x={y * CELL}
                y={x * CELL}
                width={DOT}
                height={DOT}
                rx={2}
                fill={val >= 0 ? 'var(--accent)' : 'var(--ink)'}
                opacity={0.06 + 0.94 * mag}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div style={label}>{k}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: accent ? 'var(--accent)' : 'var(--ink)', marginTop: 3 }}>
        {v}
      </div>
    </div>
  );
}

export default function RankReconstruction() {
  const [r, setR] = useState(3);
  const recon = reconstruct(r);
  const energy = energyCaptured(r);
  const err = Math.sqrt(Math.max(0, 1 - energy));
  const loraParams = r * (N + N);
  const fullParams = N * N;
  const maxSigma = SIGMA[0];

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '20px', background: 'var(--paper-2)' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ ...mono, width: 74, flexShrink: 0 }}>
          rank r <strong style={{ color: 'var(--ink)' }}>{r}</strong>
        </span>
        <input
          type="range"
          min={1}
          max={N}
          step={1}
          value={r}
          onChange={(e) => setR(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
          aria-label="reconstruction rank"
        />
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 'clamp(12px, 4vw, 32px)', alignItems: 'flex-start', marginBottom: 24 }}>
        <Heat M={TARGET} title={`full matrix · rank ${N}`} />
        <Heat M={recon} title={`rebuilt from rank ${r}`} />
      </div>

      <div style={{ ...label, marginBottom: 7 }}>how much each rank contributes (its singular value)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, marginBottom: 22 }}>
        {SIGMA.map((s, i) => (
          <div
            key={i}
            title={`rank ${i + 1}`}
            style={{
              flex: 1,
              height: `${Math.max(3, (s / maxSigma) * 100)}%`,
              borderRadius: '2px 2px 0 0',
              background: i < r ? 'var(--accent)' : 'var(--line-2)',
              transition: 'background 120ms',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 36px', padding: '14px 16px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line)' }}>
        <Stat k="energy captured" v={`${(energy * 100).toFixed(1)}%`} accent />
        <Stat k="reconstruction error" v={`${(err * 100).toFixed(1)}%`} />
        <Stat k="numbers used" v={`${loraParams} / ${fullParams}`} />
      </div>
    </div>
  );
}
