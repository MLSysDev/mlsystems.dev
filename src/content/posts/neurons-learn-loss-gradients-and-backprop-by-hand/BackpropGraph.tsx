import { useState } from 'react';

// One neuron, five operations, four leaves. Small enough that every number on
// screen can be checked with a calculator — which is the whole point.
type Inputs = { w: number; x: number; b: number; y: number };

const forward = ({ w, x, b, y }: Inputs) => {
  const p = w * x;
  const n = p + b;
  const a = Math.tanh(n);
  const d = a - y;
  const L = d * d;
  return { p, n, a, d, L };
};

const backward = (i: Inputs) => {
  const { a, d } = forward(i);
  const gL = 1;
  const gd = 2 * d * gL;
  const ga = gd;
  const gy = -gd;
  const gn = ga * (1 - a * a);
  const gp = gn;
  const gb = gn;
  const gw = gp * i.x;
  const gx = gp * i.w;
  return { gL, gd, ga, gy, gn, gp, gb, gw, gx };
};

const f = (n: number, d = 4) => (Object.is(n, -0) ? 0 : n).toFixed(d);

// Which values and which gradients are on screen at each step.
const VALUE_AT: Record<string, number> = { p: 1, n: 2, a: 3, d: 4, L: 5 };
const GRAD_AT: Record<string, number> = {
  L: 6,
  d: 7,
  a: 8,
  y: 8,
  n: 9,
  p: 10,
  b: 10,
  w: 11,
  x: 11,
};
const LAST = 11;

// Boxes on the wire, plus the four leaves that feed into them.
const POS: Record<string, [number, number]> = {
  w: [48, 34],
  x: [48, 122],
  p: [168, 78],
  b: [168, 196],
  n: [288, 78],
  a: [408, 78],
  y: [408, 196],
  d: [516, 78],
  L: [612, 78],
};
const EDGES: [string, string][] = [
  ['w', 'p'],
  ['x', 'p'],
  ['p', 'n'],
  ['b', 'n'],
  ['n', 'a'],
  ['a', 'd'],
  ['y', 'd'],
  ['d', 'L'],
];
const BW = 84;
const BH = 44;

export default function BackpropGraph() {
  const [inp, setInp] = useState<Inputs>({ w: 1.5, x: 2, b: -2, y: 0 });
  const [step, setStep] = useState(0);
  const [check, setCheck] = useState(false);

  const v = forward(inp);
  const g = backward(inp);

  const val: Record<string, number> = { ...inp, ...v };
  const grad: Record<string, number> = {
    w: g.gw,
    x: g.gx,
    b: g.gb,
    y: g.gy,
    p: g.gp,
    n: g.gn,
    a: g.ga,
    d: g.gd,
    L: g.gL,
  };

  const showVal = (k: string) => (VALUE_AT[k] === undefined ? true : step >= VALUE_AT[k]);
  const showGrad = (k: string) => step >= (GRAD_AT[k] ?? 99);
  const phase = step === 0 ? 'idle' : step <= 5 ? 'forward' : 'backward';

  const lit: Record<number, string[]> = {
    1: ['w', 'x', 'p'],
    2: ['p', 'b', 'n'],
    3: ['n', 'a'],
    4: ['a', 'y', 'd'],
    5: ['d', 'L'],
    6: ['L'],
    7: ['L', 'd'],
    8: ['d', 'a', 'y'],
    9: ['a', 'n'],
    10: ['n', 'p', 'b'],
    11: ['p', 'w', 'x'],
  };
  const active = lit[step] ?? [];

  const NOTE: string[] = [
    'Four numbers go in: the weight w, the input x, the bias b, and the target y. Press ▶ to push them through.',
    `p = w × x = ${f(inp.w, 2)} × ${f(inp.x, 2)} = ${f(v.p)}. The weight scales the input — this is the "weighted vote".`,
    `n = p + b = ${f(v.p)} + ${f(inp.b, 2)} = ${f(v.n)}. The bias shifts the vote up or down regardless of the input.`,
    `a = tanh(n) = tanh(${f(v.n)}) = ${f(v.a)}. The squash. Everything the neuron says now lives strictly between −1 and 1.`,
    `d = a − y = ${f(v.a)} − ${f(inp.y, 2)} = ${f(v.d)}. How far off we are, sign included.`,
    `L = d² = ${f(v.d)}² = ${f(v.L)}. One number for how wrong the whole thing is. Forward pass done — now we walk back.`,
    'Seed the backward pass: ∂L/∂L = 1. Nudging L by one unit changes L by one unit. Trivially true, and it is where every gradient comes from.',
    `∂L/∂d = 2d = 2 × ${f(v.d)} = ${f(g.gd)}. Local rule for squaring. Nudge d up a hair and L moves 2d times as much.`,
    `Subtraction splits blame two ways: ∂L/∂a = ${f(g.gd)} × 1 = ${f(g.ga)}, and ∂L/∂y = ${f(g.gd)} × (−1) = ${f(g.gy)}. The minus sign on y is the whole difference.`,
    `∂L/∂n = ∂L/∂a × (1 − a²) = ${f(g.ga)} × ${f(1 - v.a * v.a)} = ${f(g.gn)}. The tanh derivative. Note how it shrinks the signal — remember this in Part 3.`,
    `Addition passes blame straight through, unchanged: ∂L/∂p = ${f(g.gp)} and ∂L/∂b = ${f(g.gb)}. A plus node is a perfect conductor of gradient.`,
    `Multiplication swaps: ∂L/∂w = ∂L/∂p × x = ${f(g.gp)} × ${f(inp.x, 2)} = ${f(g.gw)}, and ∂L/∂x = ∂L/∂p × w = ${f(g.gp)} × ${f(inp.w, 2)} = ${f(g.gx)}. Each factor's blame is the other factor times what came back. Done — every leaf has its gradient from one backward walk.`,
  ];

  // The honest check: nudge each leaf numerically and compare.
  const h = 1e-4;
  const fd = (k: keyof Inputs) =>
    (forward({ ...inp, [k]: inp[k] + h }).L - forward({ ...inp, [k]: inp[k] - h }).L) / (2 * h);

  const setNum = (k: keyof Inputs, s: string) => {
    const n = parseFloat(s);
    if (!Number.isNaN(n)) setInp((o) => ({ ...o, [k]: n }));
  };

  return (
    <div className="bg1">
      <div className="bg1-bar">
        <span className={`bg1-phase bg1-${phase}`}>
          {phase === 'idle' ? 'ready' : phase === 'forward' ? 'forward pass →' : '← backward pass'}
        </span>
        <span className="bg1-spacer" />
        {(['w', 'x', 'b', 'y'] as const).map((k) => (
          <label key={k} className="bg1-inp">
            {k}
            <input
              type="number"
              step={0.5}
              value={inp[k]}
              onChange={(e) => setNum(k, e.target.value)}
            />
          </label>
        ))}
      </div>

      <svg
        viewBox="0 0 680 272"
        className="bg1-svg"
        role="img"
        aria-label="Computation graph of one neuron with values flowing forward and gradients flowing backward"
      >
        <defs>
          <marker id="bg1-f" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>

        {EDGES.map(([from, to]) => {
          const [x1, y1] = POS[from];
          const [x2, y2] = POS[to];
          const on = active.includes(from) && active.includes(to);
          const back = step >= 6;
          const sx = x1 + BW / 2;
          const sy = y1 + BH / 2;
          const ex = x2 - BW / 2;
          const ey = y2 + BH / 2;
          const mid = (sx + ex) / 2;
          const path = `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ey}, ${ex} ${ey}`;
          const rpath = `M ${ex} ${ey} C ${mid} ${ey}, ${mid} ${sy}, ${sx} ${sy}`;
          return (
            <path
              key={`${from}-${to}`}
              d={back ? rpath : path}
              className={`bg1-edge ${on ? (back ? 'bg1-edge-back' : 'bg1-edge-fwd') : ''}`}
              markerEnd="url(#bg1-f)"
            />
          );
        })}

        {Object.entries(POS).map(([k, [cx, cy]]) => {
          const isLeaf = VALUE_AT[k] === undefined;
          const on = active.includes(k);
          return (
            <g key={k} className={`bg1-node ${on ? 'on' : ''} ${isLeaf ? 'leaf' : ''}`}>
              <rect x={cx - BW / 2} y={cy} width={BW} height={BH} rx={7} className="bg1-box" />
              <text x={cx - BW / 2 + 8} y={cy + 15} className="bg1-name">
                {k}
              </text>
              <text x={cx + BW / 2 - 8} y={cy + 15} className="bg1-op" textAnchor="end">
                {OPLABEL[k] ?? ''}
              </text>
              <text x={cx} y={cy + 31} className="bg1-val" textAnchor="middle">
                {showVal(k) ? f(val[k], 4) : '·'}
              </text>
              {showGrad(k) && (
                <text x={cx} y={cy + BH + 15} className="bg1-grad" textAnchor="middle">
                  ∂L/∂{k} = {f(grad[k], 4)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <p className="bg1-note">
        <span className="bg1-stepno">
          {step === 0 ? '—' : step <= 5 ? `F${step}` : `B${step - 5}`}
        </span>
        {NOTE[step]}
      </p>

      <div className="bg1-ctrls">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          ◀ Back
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(LAST, s + 1))}
          disabled={step === LAST}
        >
          {step === 0 ? '▶ Start' : 'Next ▶'}
        </button>
        <button type="button" onClick={() => setStep(5)}>
          Skip to backward
        </button>
        <button type="button" onClick={() => setStep(0)}>
          Reset
        </button>
        <span className="bg1-spacer" />
        <button
          type="button"
          className={check ? 'on' : ''}
          onClick={() => {
            setCheck((c) => !c);
            setStep(LAST);
          }}
        >
          {check ? 'Hide the check' : 'Check it with nudges'}
        </button>
      </div>

      {check && (
        <div className="bg1-check">
          <div className="bg1-check-head">
            Nudge each leaf by ±0.0001, measure what L did, divide. Same answers, ~10<sup>6</sup>
            &nbsp;times slower per parameter.
          </div>
          <table>
            <thead>
              <tr>
                <th>leaf</th>
                <th>backprop</th>
                <th>measured by nudging</th>
                <th>difference</th>
              </tr>
            </thead>
            <tbody>
              {(['w', 'x', 'b', 'y'] as const).map((k) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{f(grad[k], 6)}</td>
                  <td>{f(fd(k), 6)}</td>
                  <td className="bg1-diff">{f(Math.abs(grad[k] - fd(k)), 9)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

const OPLABEL: Record<string, string> = {
  p: '×',
  n: '+',
  a: 'tanh',
  d: '−',
  L: '²',
};

const CSS = `
.bg1 { font-family: var(--font-sans); color: var(--ink-body); }
.bg1-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.bg1-spacer { flex: 1; }
.bg1-phase { font-family: var(--font-mono); font-size: 11px; letter-spacing: .04em; padding: 3px 8px; border-radius: var(--radius-pill); border: 1px solid var(--line-2); color: var(--ink-3); }
.bg1-forward { color: var(--accent); border-color: var(--accent); }
.bg1-backward { color: var(--tc-blue); border-color: var(--tc-blue); }
.bg1-inp { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-3); display: inline-flex; align-items: center; gap: 4px; }
.bg1-inp input { width: 62px; font: inherit; font-size: 12px; padding: 3px 5px; border: 1px solid var(--line-2); border-radius: var(--radius-sm); background: var(--paper); color: var(--ink); }
.bg1-svg { width: 100%; height: auto; color: var(--ink-4); }
.bg1-edge { fill: none; stroke: var(--line-2); stroke-width: 1.5; color: var(--line-2); }
.bg1-edge-fwd { stroke: var(--accent); color: var(--accent); stroke-width: 2.5; }
.bg1-edge-back { stroke: var(--tc-blue); color: var(--tc-blue); stroke-width: 2.5; }
.bg1-box { fill: var(--paper-2); stroke: var(--line-2); stroke-width: 1.2; }
.bg1-node.leaf .bg1-box { fill: var(--paper); stroke-dasharray: 3 2; }
.bg1-node.on .bg1-box { stroke: var(--accent); stroke-width: 2; fill: var(--accent-soft); }
.bg1-name { fill: var(--ink); font-size: 12px; font-weight: 600; font-family: var(--font-mono); }
.bg1-op { fill: var(--ink-3); font-size: 10px; font-family: var(--font-mono); }
.bg1-val { fill: var(--ink); font-size: 12.5px; font-family: var(--font-mono); }
.bg1-grad { fill: var(--tc-blue); font-size: 10.5px; font-family: var(--font-mono); }
.bg1-note { font-size: 13.5px; line-height: 1.55; margin: 2px 0 12px; min-height: 3.2em; color: var(--ink-2); }
.bg1-stepno { display: inline-block; font-family: var(--font-mono); font-size: 10.5px; color: var(--paper); background: var(--ink-2); border-radius: var(--radius-xs); padding: 1px 5px; margin-right: 8px; vertical-align: 1px; }
.bg1-ctrls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.bg1-ctrls button { font: inherit; font-size: 11.5px; font-family: var(--font-mono); padding: 5px 10px; border: 1px solid var(--line-2); background: var(--paper); color: var(--ink-2); border-radius: var(--radius-sm); cursor: pointer; }
.bg1-ctrls button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.bg1-ctrls button:disabled { opacity: .4; cursor: default; }
.bg1-ctrls button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.bg1-check { margin-top: 12px; border: 1px solid var(--line); border-radius: var(--radius-md); padding: 10px 12px; background: var(--paper-2); }
.bg1-check-head { font-size: 12px; color: var(--ink-3); margin-bottom: 8px; line-height: 1.5; }
.bg1-check table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 11.5px; }
.bg1-check th { text-align: left; font-weight: 500; color: var(--ink-3); border-bottom: 1px solid var(--line-2); padding: 4px 6px; }
.bg1-check td { padding: 4px 6px; border-bottom: 1px solid var(--line); color: var(--ink); }
.bg1-diff { color: var(--tc-green); }
`;
