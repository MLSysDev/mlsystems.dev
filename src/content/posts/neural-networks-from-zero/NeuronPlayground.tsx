import { useState, type CSSProperties, type ReactNode } from 'react';

type Activation = 'none' | 'relu' | 'sigmoid';

const ACTIVATIONS: {
  id: Activation;
  label: string;
  fn: (z: number) => number;
  formula: string;
}[] = [
  { id: 'none', label: 'None', fn: (z) => z, formula: 'f(z) = z' },
  { id: 'relu', label: 'ReLU', fn: (z) => Math.max(0, z), formula: 'f(z) = max(0, z)' },
  {
    id: 'sigmoid',
    label: 'Sigmoid',
    fn: (z) => 1 / (1 + Math.exp(-z)),
    formula: 'f(z) = 1 / (1 + e⁻ᶻ)',
  },
];

const X_MIN = -4;
const X_MAX = 4;
const Y_MIN = -3;
const Y_MAX = 3;
const W = 520;
const H = 280;
const PAD = 28;

const px = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);
const py = (y: number) => H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD);

const mono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--ink-2)',
};

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 150px' }}>
      <span style={{ ...mono, width: 62, flexShrink: 0 }}>
        {label} <strong style={{ color: 'var(--ink)' }}>{value.toFixed(1)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
        aria-label={label}
      />
    </label>
  );
}

export default function NeuronPlayground(): ReactNode {
  const [w, setW] = useState(1.5);
  const [b, setB] = useState(-1.0);
  const [x, setX] = useState(1.0);
  const [act, setAct] = useState<Activation>('relu');

  const activation = ACTIVATIONS.find((a) => a.id === act)!;
  const f = activation.fn;
  const z = w * x + b;
  const y = f(z);

  const steps = 160;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const cx = X_MIN + ((X_MAX - X_MIN) * i) / steps;
    pts.push(`${px(cx).toFixed(1)},${py(f(w * cx + b)).toFixed(1)}`);
  }
  const yVisible = y >= Y_MIN && y <= Y_MAX;
  const bSigned = b < 0 ? `− ${Math.abs(b).toFixed(1)}` : `+ ${b.toFixed(1)}`;

  return (
    <div
      style={{
        margin: '32px 0',
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
        Playground · one neuron
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', marginBottom: 10 }}>
        <Slider label="input x" value={x} min={X_MIN} max={X_MAX} onChange={setX} />
        <Slider label="weight w" value={w} min={-3} max={3} onChange={setW} />
        <Slider label="bias b" value={b} min={-3} max={3} onChange={setB} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ ...mono, color: 'var(--ink-3)' }}>activation</span>
        {ACTIVATIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAct(a.id)}
            style={{
              ...mono,
              padding: '4px 10px',
              borderRadius: 5,
              cursor: 'pointer',
              border: `1px solid ${a.id === act ? 'var(--accent)' : 'var(--line-2)'}`,
              background: a.id === act ? 'var(--accent-soft)' : 'transparent',
              color: a.id === act ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {a.label}
          </button>
        ))}
        <span style={{ ...mono, color: 'var(--ink-3)', marginLeft: 'auto' }}>
          {activation.formula}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Plot of the neuron output y = f(w·x + b) as x varies"
        style={{ width: '100%', height: 'auto', display: 'block', color: 'var(--ink)' }}
      >
        <clipPath id="np-plot-area">
          <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
        </clipPath>
        <line x1={px(X_MIN)} y1={py(0)} x2={px(X_MAX)} y2={py(0)} stroke="currentColor" strokeWidth="1" opacity="0.25" />
        <line x1={px(0)} y1={py(Y_MIN)} x2={px(0)} y2={py(Y_MAX)} stroke="currentColor" strokeWidth="1" opacity="0.25" />
        {[-3, -2, -1, 1, 2, 3].map((t) => (
          <g key={t} opacity="0.4">
            <line x1={px(t)} y1={py(0) - 3} x2={px(t)} y2={py(0) + 3} stroke="currentColor" />
            <text x={px(t)} y={py(0) + 16} textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        ))}
        {[-2, -1, 1, 2].map((t) => (
          <g key={t} opacity="0.4">
            <line x1={px(0) - 3} y1={py(t)} x2={px(0) + 3} y2={py(t)} stroke="currentColor" />
            <text x={px(0) - 8} y={py(t) + 3} textAnchor="end" fontSize="10" fill="currentColor" fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        ))}
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          clipPath="url(#np-plot-area)"
        />
        {yVisible ? (
          <>
            <line x1={px(x)} y1={py(0)} x2={px(x)} y2={py(y)} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <line x1={px(0)} y1={py(y)} x2={px(x)} y2={py(y)} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <circle cx={px(x)} cy={py(y)} r="6" fill="var(--accent)" stroke="var(--paper)" strokeWidth="2" />
          </>
        ) : (
          <>
            <line x1={px(x)} y1={py(0)} x2={px(x)} y2={y > Y_MAX ? PAD : H - PAD} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <text
              x={px(x)}
              y={y > Y_MAX ? PAD - 6 : H - PAD + 18}
              textAnchor="middle"
              fontSize="11"
              fill="var(--accent)"
              fontFamily="var(--font-mono)"
            >
              y = {y.toFixed(2)} (off the chart {y > Y_MAX ? '↑' : '↓'})
            </text>
          </>
        )}
        <text x={W - PAD} y={PAD - 8} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.6" fontFamily="var(--font-mono)">
          y = f(w·x + b)
        </text>
      </svg>

      <div
        style={{
          ...mono,
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 6,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        y = f(w·x + b) = f({w.toFixed(1)} × {x.toFixed(1)} {bSigned}) = f({z.toFixed(2)}) ={' '}
        <strong style={{ color: 'var(--accent)' }}>{y.toFixed(2)}</strong>
      </div>

      <div style={{ ...mono, marginTop: 10, color: 'var(--ink-3)', fontSize: 11.5 }}>
        Try it: set activation to <strong>None</strong> — no matter what you do, the curve is a
        straight line. Switch to <strong>ReLU</strong> and drag the bias: the bend moves. That bend
        is the entire reason depth works.
      </div>
    </div>
  );
}
