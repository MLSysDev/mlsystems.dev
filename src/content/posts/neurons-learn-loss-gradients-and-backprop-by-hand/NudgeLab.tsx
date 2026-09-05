import { useMemo, useRef, useState } from 'react';

// Three points on the line y = 2x. One knob, so the whole landscape fits on a
// page and every number on screen can be checked with a calculator.
const DATA: [number, number][] = [
  [1, 2],
  [2, 4],
  [3, 6],
];

const loss = (w: number) => DATA.reduce((s, [x, y]) => s + (w * x - y) ** 2, 0) / DATA.length;

const exactGrad = (w: number) =>
  DATA.reduce((s, [x, y]) => s + 2 * x * (w * x - y), 0) / DATA.length;

// The plotted domain runs wider than the slider by the largest nudge, so the
// probe point is always on screen and no value is ever silently clamped.
const EPS_MAX = 0.5;
const W_LO = -1;
const W_HI = 5;
const D_LO = W_LO - EPS_MAX;
const D_HI = W_HI + EPS_MAX;
const L_MAX = Math.ceil(Math.max(loss(D_LO), loss(D_HI)) / 10) * 10;

const X0 = 62;
const X1 = 404;
const Y0 = 252;
const Y1 = 20;

const px = (w: number) => X0 + ((w - D_LO) / (D_HI - D_LO)) * (X1 - X0);
const py = (l: number) => Y0 - (l / L_MAX) * (Y0 - Y1);

const fmt = (n: number, d = 3) => (Object.is(n, -0) ? 0 : n).toFixed(d);

export default function NudgeLab() {
  const [w, setW] = useState(0.2);
  const [eps, setEps] = useState(EPS_MAX);
  const [lr, setLr] = useState(0.05);
  const [trail, setTrail] = useState<number[]>([]);
  const timer = useRef<number | null>(null);

  const L = loss(w);
  const wProbe = w + eps;
  const lProbe = loss(wProbe);

  // One nudge, one measurement: the secant slope from here to there.
  const measured = (lProbe - L) / eps;
  const exact = exactGrad(w);
  const nextW = w - lr * exact;

  // Refs, not state: the interval outlives the render that created it and would
  // otherwise step from a stale w at a stale learning rate.
  const wRef = useRef(w);
  wRef.current = w;
  const lrRef = useRef(lr);
  lrRef.current = lr;

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const wi = D_LO + ((D_HI - D_LO) * i) / 240;
      pts.push(`${px(wi).toFixed(2)},${py(loss(wi)).toFixed(2)}`);
    }
    return pts.join(' ');
  }, []);

  const stop = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const step = () => {
    const cur = wRef.current;
    const next = cur - lrRef.current * exactGrad(cur);
    wRef.current = next;
    setTrail((t) => [...t.slice(-30), cur]);
    setW(next);
  };

  const run = () => {
    stop();
    let n = 0;
    timer.current = window.setInterval(() => {
      step();
      if (++n >= 25) stop();
    }, 110);
  };

  const reset = () => {
    stop();
    setTrail([]);
    setW(0.2);
  };

  // Both lines are built from real (w, loss) pairs and clipped by the SVG, so
  // the angle on screen is the true slope under the axis scaling.
  const seg = (slope: number, half: number) => ({
    x1: px(w - half),
    y1: py(L - slope * half),
    x2: px(w + half),
    y2: py(L + slope * half),
  });
  const tangent = seg(exact, 3.4);
  const secant = seg(measured, 3.4);

  const diverging = Math.abs(nextW - 2) > Math.abs(w - 2) + 1e-9;
  const settled = Math.abs(exact) < 1e-4;

  return (
    <div className="nl">
      <div className="nl-grid">
        <svg
          viewBox="0 0 420 292"
          className="nl-plot"
          role="img"
          aria-label="Loss against the single weight w, showing the secant measured from one nudge and the exact tangent"
        >
          <defs>
            <clipPath id="nl-clip">
              <rect x={X0} y={Y1} width={X1 - X0} height={Y0 - Y1} />
            </clipPath>
            <marker id="nl-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" className="nl-arrow-head" />
            </marker>
          </defs>

          <line x1={X0} y1={Y0} x2={X1} y2={Y0} className="nl-axis" />
          {[-1, 0, 1, 2, 3, 4, 5].map((t) => (
            <g key={t}>
              <line x1={px(t)} y1={Y0} x2={px(t)} y2={Y0 + 4} className="nl-axis" />
              <text x={px(t)} y={Y0 + 16} className="nl-tick" textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          <text x={X1} y={Y0 + 32} className="nl-tick" textAnchor="end">
            weight w
          </text>

          <line x1={X0} y1={Y0} x2={X0} y2={Y1} className="nl-axis" />
          {[0, 20, 40, 60].filter((v) => v <= L_MAX).map((v) => (
            <g key={v}>
              <line x1={X0 - 4} y1={py(v)} x2={X0} y2={py(v)} className="nl-axis" />
              <text x={X0 - 8} y={py(v) + 3.5} className="nl-tick" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <text
            className="nl-tick"
            textAnchor="middle"
            transform={`rotate(-90 20 ${(Y0 + Y1) / 2})`}
            x={20}
            y={(Y0 + Y1) / 2}
          >
            loss
          </text>

          <g clipPath="url(#nl-clip)">
            <polyline points={curve} className="nl-curve" />

            {trail.map((tw, i) => (
              <circle
                key={i}
                cx={px(tw)}
                cy={py(loss(tw))}
                r={2.5}
                className="nl-trail"
                opacity={0.12 + (0.5 * i) / Math.max(trail.length, 1)}
              />
            ))}

            <line
              x1={tangent.x1}
              y1={tangent.y1}
              x2={tangent.x2}
              y2={tangent.y2}
              className="nl-tangent"
            />
            <line
              x1={secant.x1}
              y1={secant.y1}
              x2={secant.x2}
              y2={secant.y2}
              className="nl-secant"
            />

            <line x1={px(w)} y1={py(L)} x2={px(wProbe)} y2={py(L)} className="nl-probe" />
            <line x1={px(wProbe)} y1={py(L)} x2={px(wProbe)} y2={py(lProbe)} className="nl-probe" />
            <circle cx={px(wProbe)} cy={py(lProbe)} r={4} className="nl-probe-dot" />
            <circle cx={px(w)} cy={py(L)} r={5.5} className="nl-dot" />
          </g>

          <line x1={px(w)} y1={py(L)} x2={px(w)} y2={Y0 - 7} className="nl-drop" />
          {!settled && (
            <line
              x1={px(w)}
              y1={Y0 - 7}
              x2={px(Math.max(D_LO, Math.min(D_HI, nextW)))}
              y2={Y0 - 7}
              className="nl-arrow"
              markerEnd="url(#nl-head)"
            />
          )}
        </svg>

        <div className="nl-side">
          <div className="nl-read">
            <div className="nl-row">
              <span>loss here</span>
              <b>{fmt(L)}</b>
            </div>
            <div className="nl-row">
              <span>loss after the nudge</span>
              <b>{fmt(lProbe)}</b>
            </div>
            <div className="nl-row nl-small">
              <span>so the loss changed by</span>
              <b>{fmt(lProbe - L)}</b>
            </div>
            <div className="nl-sep" />
            <div className="nl-row nl-measured">
              <span>change ÷ nudge</span>
              <b>{fmt(measured)}</b>
            </div>
            <div className="nl-row nl-hi">
              <span>exact gradient</span>
              <b>{fmt(exact)}</b>
            </div>
            <div className="nl-row nl-small">
              <span>how far off</span>
              <b>{fmt(Math.abs(measured - exact), 5)}</b>
            </div>
          </div>

          <div className="nl-verdict">
            {settled
              ? 'The slope is zero. Nothing left to learn — this is the bottom.'
              : exact > 0
                ? 'Slope positive: raising w raises the loss, so the step goes left.'
                : 'Slope negative: raising w lowers the loss, so the step goes right.'}
          </div>

          <div className="nl-key">
            <span>
              <svg width="26" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="26" y2="4" className="nl-secant" />
              </svg>
              measured from one nudge
            </span>
            <span>
              <svg width="26" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="26" y2="4" className="nl-tangent" />
              </svg>
              the exact answer
            </span>
          </div>
        </div>
      </div>

      <div className="nl-controls">
        <label className="nl-ctl">
          <span>
            w = <b>{fmt(w, 4)}</b>
          </span>
          <input
            type="range"
            min={W_LO}
            max={W_HI}
            step={0.01}
            value={w}
            onChange={(e) => {
              stop();
              setTrail([]);
              setW(parseFloat(e.target.value));
            }}
          />
        </label>

        <div className="nl-ctl">
          <span>
            nudge size ε = <b>{eps}</b>
          </span>
          <span className="nl-seg">
            {[0.5, 0.2, 0.05, 0.01].map((e) => (
              <button
                key={e}
                type="button"
                className={e === eps ? 'on' : ''}
                onClick={() => setEps(e)}
              >
                {e}
              </button>
            ))}
          </span>
        </div>

        <label className="nl-ctl">
          <span>
            learning rate = <b>{lr.toFixed(3)}</b>
          </span>
          <input
            type="range"
            min={0.005}
            max={0.3}
            step={0.005}
            value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value))}
          />
        </label>

        <div className="nl-btns">
          <button type="button" onClick={step}>
            One step
          </button>
          <button type="button" onClick={run}>
            Run 25
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      {diverging && (
        <div className="nl-warn">
          The learning rate is too high. Each step lands further from the bottom than the last, so
          the loss climbs instead of falling.
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.nl { font-family: var(--font-sans); color: var(--ink-body); }
.nl-grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(200px,1fr); gap: 18px; align-items: start; }
@media (max-width: 640px) { .nl-grid { grid-template-columns: 1fr; } }
.nl-plot { width: 100%; height: auto; }
.nl-axis { stroke: var(--line-2); stroke-width: 1; }
.nl-tick { fill: var(--ink-3); font-size: 9.5px; font-family: var(--font-mono); }
.nl-curve { fill: none; stroke: var(--ink-4); stroke-width: 2; }
.nl-tangent { fill: none; stroke: var(--accent); stroke-width: 2; }
.nl-secant { fill: none; stroke: var(--ink-2); stroke-width: 2; stroke-dasharray: 6 4; }
.nl-dot { fill: var(--accent); }
.nl-trail { fill: var(--ink-3); }
.nl-probe { stroke: var(--ink-3); stroke-width: 1; stroke-dasharray: 2 3; }
.nl-probe-dot { fill: var(--paper); stroke: var(--ink-2); stroke-width: 1.8; }
.nl-drop { stroke: var(--ink-4); stroke-width: 1; stroke-dasharray: 2 3; }
.nl-arrow { stroke: var(--accent-2); stroke-width: 2; }
.nl-arrow-head { fill: var(--accent-2); }
.nl-side { display: flex; flex-direction: column; gap: 11px; }
.nl-read { border: 1px solid var(--line); border-radius: var(--radius-md); padding: 10px 12px; background: var(--paper-2); }
.nl-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 3px 0; }
.nl-row b { font-family: var(--font-mono); color: var(--ink); }
.nl-measured b { color: var(--ink); }
.nl-hi b { color: var(--accent); }
.nl-small { font-size: 11px; color: var(--ink-3); }
.nl-sep { height: 1px; background: var(--line); margin: 7px 0; }
.nl-verdict { font-size: 12.5px; line-height: 1.45; color: var(--ink-2); border-left: 2px solid var(--accent); padding-left: 10px; }
.nl-key { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: var(--ink-3); }
.nl-key span { display: flex; align-items: center; gap: 7px; }
.nl-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px 18px; margin-top: 16px; align-items: end; }
.nl-ctl { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--ink-2); }
.nl-ctl b { font-family: var(--font-mono); color: var(--ink); }
.nl-ctl input[type=range] { width: 100%; accent-color: var(--accent); }
.nl-seg { display: flex; gap: 4px; }
.nl-seg button, .nl-btns button { font: inherit; font-size: 11.5px; font-family: var(--font-mono); padding: 4px 9px; border: 1px solid var(--line-2); background: var(--paper); color: var(--ink-2); border-radius: var(--radius-sm); cursor: pointer; }
.nl-seg button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.nl-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.nl-btns button:hover, .nl-seg button:hover { border-color: var(--accent); color: var(--accent); }
.nl-seg button.on:hover { color: #fff; }
.nl-warn { margin-top: 12px; font-size: 12.5px; line-height: 1.5; color: var(--tc-red); border: 1px dashed currentColor; border-radius: var(--radius-sm); padding: 8px 10px; }
`;
