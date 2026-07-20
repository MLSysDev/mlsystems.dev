import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

const X = [0.82, 0.34, 0.68, 0.22, 0.74, 0.46, 0.58, 0.28];
const WX = [0.52, 0.38, 0.64, 0.44, 0.57, 0.35];
const B_MIX = [
  [0.9, 0.16, 0.7, 0.12, 0.62, 0.2, 0.74, 0.3],
  [0.12, 0.82, 0.28, 0.78, 0.22, 0.72, 0.36, 0.68],
  [0.48, 0.22, 0.16, 0.66, 0.86, 0.42, 0.24, 0.58],
];
const A_MIX = [
  [0.76, 0.28, 0.52],
  [0.18, 0.78, 0.34],
  [0.58, 0.2, 0.76],
  [0.32, 0.56, 0.82],
  [0.72, 0.34, 0.22],
  [0.28, 0.74, 0.5],
];
// W is d_out × d_in (6 × 8) — the full, dense frozen matrix.
const W_MIX = Array.from({ length: 6 }, (_, r) =>
  Array.from({ length: 8 }, (_, c) => 0.55 + 0.35 * Math.abs(Math.sin((r + 1.3) * (c + 1.7)))),
);

function wavg(values: number[], weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  return values.reduce((a, v, i) => a + v * weights[i], 0) / total;
}
function nodeY(i: number, n: number, cy: number, gap: number): number {
  return cy + (i - (n - 1) / 2) * gap;
}
// smoothstep reveal: 0 before a, 1 after b
function ss(a: number, b: number, t: number): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const u = (t - a) / (b - a);
  return u * u * (3 - 2 * u);
}

type Pt = [number, number];
// Position along a polyline at fraction f (0..1), by arc length.
function pointAt(pts: Pt[], f: number): Pt {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let dist = f * total;
  for (let i = 0; i < seg.length; i++) {
    if (dist <= seg[i]) {
      const k = seg[i] ? dist / seg[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    dist -= seg[i];
  }
  return pts[pts.length - 1];
}

// deliberate grid so every label sits on its object
const X_CX = 52;
const X_CY = 150;
const X_GAP = 15;
const WX_CX = 258;
const WX_CY = 64;
const WX_GAP = 11;
const Z_CX = 298;
const Z_CY = 194;
const Z_GAP = 22;
const D_CX = 452;
const D_CY = 194;
const D_GAP = 12;
const PLUS_X = 556;
const PLUS_Y = 128;
const H_CX = 628;
const H_CY = 128;
const H_GAP = 12;
const B_X = 150;
const B_Y = 178;
const A_X = 356;
const A_Y = 160;
const CELL = 9;
const CGAP = 3;
const W_X = 148;
const W_Y = 44;
const W_CELL = 5.5;
const W_GAP = 1.5;

// dot routes, sampled to hug the actual (curved) arrows
const TOP_ROUTE: Pt[] = [
  [60, 122],
  [106, 82],
  [140, 64],
  [212, 64],
  [258, 64],
  [350, 74],
  [429, 88],
  [495, 104],
  [541, 120],
  [556, 128],
  [628, 128],
];
const BOT_ROUTE: Pt[] = [
  [60, 176],
  [108, 189],
  [148, 194],
  [243, 194],
  [298, 194],
  [356, 194],
  [389, 194],
  [452, 194],
  [487, 179],
  [511, 164],
  [529, 150],
  [543, 138],
  [556, 128],
  [628, 128],
];

function Vector({
  values,
  cx,
  cy,
  gap,
  color,
  opacity = 1,
}: {
  values: number[];
  cx: number;
  cy: number;
  gap: number;
  color: string;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      {values.map((value, i) => (
        <rect
          key={`${cx}-${i}`}
          x={cx - 5}
          y={nodeY(i, values.length, cy, gap) - 5}
          width={10}
          height={10}
          rx={3}
          fill={color}
          opacity={0.16 + 0.72 * Math.min(1, value)}
        />
      ))}
    </g>
  );
}

function Grid({
  x,
  y,
  mix,
  active,
  color = 'var(--accent)',
  cell = CELL,
  gap = CGAP,
  base = 0.1,
  scale = 0.34,
}: {
  x: number;
  y: number;
  mix: number[][];
  active: number;
  color?: string;
  cell?: number;
  gap?: number;
  base?: number;
  scale?: number;
}) {
  return (
    <g>
      {mix.map((row, r) =>
        row.map((value, c) => (
          <rect
            key={`${r}-${c}`}
            x={x + c * (cell + gap)}
            y={y + r * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={color}
            opacity={(base + value * scale) * active}
          />
        )),
      )}
    </g>
  );
}

export default function SidePathFlow() {
  const [enabled, setEnabled] = useState(true);
  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    let start: number | null = null;
    const loop = (now: number) => {
      if (start === null) start = now;
      setT(((now - start) / 3400) % 1);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const on = enabled;
  const z = useMemo(() => (on ? B_MIX.map((w) => wavg(X, w)) : [0, 0, 0]), [on]);
  const delta = useMemo(() => A_MIX.map((w) => wavg(z, w) * 0.9), [z]);

  // reveal factors, driven by where the single dot is along its route
  const wxOn = ss(0.28, 0.42, t);
  const bOn = on ? ss(0.12, 0.3, t) : 0;
  const zOn = on ? ss(0.34, 0.46, t) : 0;
  const aOn = on ? ss(0.5, 0.68, t) : 0;
  const abOn = on ? ss(0.66, 0.76, t) : 0;
  const hOn = ss(0.88, 1, t); // both dots deliver to h at the end

  const topDot = pointAt(TOP_ROUTE, t);
  const botDot = pointAt(BOT_ROUTE, t);

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '18px 20px', background: 'var(--paper-2)' }}>
      <svg
        viewBox="0 0 700 268"
        style={{ width: '100%', height: 'auto', display: 'block', color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}
        role="img"
        aria-label="LoRA side path. A grey dot carries x through the frozen W into Wx; an accent dot carries x through B into the bottleneck z, through A into the ABx correction; the two meet at + and light up h. Each stage lights up as the dot reaches it."
      >
        <defs>
          <marker id="spf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* input x */}
        <Vector values={X} cx={X_CX} cy={X_CY} gap={X_GAP} color="var(--ink)" />
        <text x={X_CX} y={80} fontSize="12" textAnchor="middle" fill="currentColor" opacity="0.8">x</text>
        <text x={X_CX} y={222} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.55">d_in features</text>

        {/* TOP: frozen path  x -> W -> Wx */}
        <path d="M60 122 C96 92, 120 66, 140 64" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.28" markerEnd="url(#spf-arrow)" />
        <rect x="142" y="38" width="68" height="52" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <Grid x={W_X} y={W_Y} mix={W_MIX} active={1} color="currentColor" cell={W_CELL} gap={W_GAP} base={0.12} scale={0.2} />
        <text x="176" y="30" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">frozen W · not trained</text>
        <text x="176" y="104" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.55">d_out × d_in · dense</text>
        <path d="M212 64 L252 64" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4" markerEnd="url(#spf-arrow)" />
        <Vector values={WX} cx={WX_CX} cy={WX_CY} gap={WX_GAP} color="var(--line-2)" opacity={0.3 + 0.7 * wxOn} />
        <text x={WX_CX} y={106} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.55">Wx</text>

        {/* BOTTOM: adapter path  x -> B -> z -> A -> ABx */}
        <path d="M60 176 C96 186, 122 194, 148 194" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity={on ? 0.5 : 0.15} markerEnd="url(#spf-arrow)" />
        <Grid x={B_X} y={B_Y} mix={B_MIX} active={on ? 0.12 + 0.88 * bOn : 0.12} />
        <text x="196" y="171" fontSize="13" textAnchor="middle" fill="currentColor" opacity={on ? 0.9 : 0.3}>B</text>
        <text x="196" y="231" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">r × d_in · wide</text>

        <path d="M243 194 L292 194" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity={on ? 0.5 : 0.1} markerEnd="url(#spf-arrow)" />
        <Vector values={z} cx={Z_CX} cy={Z_CY} gap={Z_GAP} color="var(--accent)" opacity={on ? 0.25 + 0.75 * zOn : 0.4} />
        <text x={Z_CX} y={158} fontSize="10.5" textAnchor="middle" fill="currentColor" opacity="0.7">z = Bx</text>

        <path d="M304 194 L354 194" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity={on ? 0.5 : 0.1} markerEnd="url(#spf-arrow)" />
        <Grid x={A_X} y={A_Y} mix={A_MIX} active={on ? 0.12 + 0.88 * aOn : 0.12} />
        <text x="372" y="150" fontSize="13" textAnchor="middle" fill="currentColor" opacity={on ? 0.9 : 0.3}>A</text>
        <text x="372" y="247" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">d_out × r · tall</text>

        <path d="M389 194 L446 194" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity={on ? 0.5 : 0.1} markerEnd="url(#spf-arrow)" />
        <Vector values={delta} cx={D_CX} cy={D_CY} gap={D_GAP} color="var(--accent)" opacity={on ? 0.2 + 0.8 * abOn : 0.3} />
        <text x={D_CX} y={150} fontSize="10" textAnchor="middle" fill="var(--accent)" opacity={on ? 0.8 : 0.3}>ABx</text>

        {/* merge into h */}
        <path d="M264 64 C380 74, 496 100, 541 120" stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.28" markerEnd="url(#spf-arrow)" />
        <path d="M458 190 C500 178, 528 150, 543 138" stroke="var(--accent)" strokeWidth="1.1" fill="none" opacity={on ? 0.2 + 0.4 * abOn : 0} markerEnd="url(#spf-arrow)" />
        <circle cx={PLUS_X} cy={PLUS_Y} r="14" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity="0.8" />
        <text x={PLUS_X} y={PLUS_Y + 5} fontSize="16" textAnchor="middle" fill="var(--accent)">+</text>
        <path d="M570 128 L621 128" stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.4" markerEnd="url(#spf-arrow)" />

        {/* h = grey Wx base + accent ABx correction, both revealed as the dots arrive */}
        <g>
          {WX.map((base, i) => {
            const cy = nodeY(i, WX.length, H_CY, H_GAP);
            const corr = on ? Math.min(1, delta[i]) : 0;
            return (
              <g key={`h-${i}`}>
                <rect x={H_CX - 5} y={cy - 5} width={10} height={10} rx={3} fill="var(--ink)" opacity={(0.16 + 0.72 * base) * (0.18 + 0.82 * hOn)} />
                {corr > 0.01 && (
                  <rect x={H_CX - 5} y={cy - 5} width={10} height={10} rx={3} fill="var(--accent)" opacity={(0.3 + 0.6 * corr) * hOn} />
                )}
              </g>
            );
          })}
        </g>
        <text x={H_CX} y={80} fontSize="12" textAnchor="middle" fill="currentColor" opacity="0.8">h</text>
        <text x={H_CX} y={180} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">{on ? 'h = Wx + ABx' : 'h = Wx'}</text>

        {/* one dot per route, riding exactly on its arrow */}
        <circle cx={topDot[0]} cy={topDot[1]} r="4.5" fill="var(--ink)" opacity="0.9" />
        {on && <circle cx={botDot[0]} cy={botDot[1]} r="4.5" fill="var(--accent)" opacity="0.95" />}
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          style={{
            ...mono,
            padding: '5px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            border: `1px solid ${enabled ? 'var(--accent)' : 'var(--line-2)'}`,
            background: enabled ? 'var(--accent-soft)' : 'transparent',
            color: enabled ? 'var(--accent)' : 'var(--ink-2)',
          }}
        >
          adapter: {enabled ? 'on' : 'off (B = 0)'}
        </button>
      </div>
    </div>
  );
}
