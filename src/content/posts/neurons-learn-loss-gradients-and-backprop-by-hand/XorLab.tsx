import { useEffect, useRef, useState, type RefObject } from 'react';

// Two identical networks, same starting weights, same data, same steps. The
// only difference is whether there is a squash between the layers — so any gap
// that opens between them is caused by that and nothing else.
const PTS: [number, number, number][] = [
  [0, 0, -1],
  [0, 1, 1],
  [1, 0, 1],
  [1, 1, -1],
];

type Net = { W1: number[][]; b1: number[]; W2: number[]; b2: number; H: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function init(H: number, seed: number): Net {
  const r = mulberry32(seed * 7919 + 13);
  const u = () => (r() * 2 - 1) * 0.9;
  return {
    H,
    W1: Array.from({ length: H }, () => [u(), u()]),
    b1: Array.from({ length: H }, () => u()),
    W2: Array.from({ length: H }, () => u()),
    b2: u(),
  };
}

const clone = (n: Net): Net => ({
  H: n.H,
  W1: n.W1.map((r) => [...r]),
  b1: [...n.b1],
  W2: [...n.W2],
  b2: n.b2,
});

function predict(net: Net, x1: number, x2: number, squash: boolean) {
  const h = new Array<number>(net.H);
  for (let i = 0; i < net.H; i++) {
    const z = net.W1[i][0] * x1 + net.W1[i][1] * x2 + net.b1[i];
    h[i] = squash ? Math.tanh(z) : z;
  }
  let o = net.b2;
  for (let i = 0; i < net.H; i++) o += net.W2[i] * h[i];
  return { h, o };
}

function stepOnce(net: Net, lr: number, squash: boolean) {
  const gW1 = net.W1.map(() => [0, 0]);
  const gb1 = new Array<number>(net.H).fill(0);
  const gW2 = new Array<number>(net.H).fill(0);
  let gb2 = 0;
  let loss = 0;

  for (const [x1, x2, t] of PTS) {
    const { h, o } = predict(net, x1, x2, squash);
    const d = o - t;
    loss += (d * d) / PTS.length;
    const go = (2 * d) / PTS.length;
    gb2 += go;
    for (let i = 0; i < net.H; i++) {
      gW2[i] += go * h[i];
      const gz = go * net.W2[i] * (squash ? 1 - h[i] * h[i] : 1);
      gW1[i][0] += gz * x1;
      gW1[i][1] += gz * x2;
      gb1[i] += gz;
    }
  }

  for (let i = 0; i < net.H; i++) {
    net.W1[i][0] -= lr * gW1[i][0];
    net.W1[i][1] -= lr * gW1[i][1];
    net.b1[i] -= lr * gb1[i];
    net.W2[i] -= lr * gW2[i];
  }
  net.b2 -= lr * gb2;
  return loss;
}

const LO = -0.45;
const HI = 1.45;
const CV = 240;
const GRID = 70;
const MAX_EPOCH = 4000;
const PER_FRAME = 30;

type Side = { net: Net; hist: number[]; dead: boolean };

export default function XorLab() {
  const [H, setH] = useState(4);
  const [lr, setLr] = useState(0.35);
  const [seed, setSeed] = useState(1);
  const [cuts, setCuts] = useState(false);
  const [running, setRunning] = useState(true);
  const [, setTick] = useState(0);

  const lin = useRef<Side>({ net: init(H, seed), hist: [], dead: false });
  const tan = useRef<Side>({ net: init(H, seed), hist: [], dead: false });
  const epoch = useRef(0);
  const cvLin = useRef<HTMLCanvasElement>(null);
  const cvTan = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);

  const restart = () => {
    const base = init(H, seed);
    lin.current = { net: clone(base), hist: [], dead: false };
    tan.current = { net: clone(base), hist: [], dead: false };
    epoch.current = 0;
    setRunning(true);
    setTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(restart, [H, seed]);

  useEffect(() => {
    if (!running) return;
    const advance = (s: Side, squash: boolean) => {
      if (s.dead) return;
      const l = stepOnce(s.net, lr, squash);
      if (!Number.isFinite(l)) {
        s.dead = true;
        return;
      }
      if (epoch.current % 10 === 0) s.hist.push(l);
    };
    const loop = () => {
      for (let k = 0; k < PER_FRAME; k++) {
        advance(lin.current, false);
        advance(tan.current, true);
        epoch.current++;
        if (epoch.current >= MAX_EPOCH) break;
      }
      setTick((t) => t + 1);
      if (epoch.current >= MAX_EPOCH || (lin.current.dead && tan.current.dead)) {
        setRunning(false);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [running, lr]);

  const paint = (cv: HTMLCanvasElement | null, s: Side, squash: boolean) => {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CV, CV);
    if (s.dead) return;
    // Base wash, so "answers zero everywhere" reads as a flat surface rather
    // than a blank canvas that looks broken.
    ctx.fillStyle = 'rgba(142, 132, 114, 0.16)';
    ctx.fillRect(0, 0, CV, CV);
    for (let i = 0; i < GRID; i++) {
      const xa = Math.round((i * CV) / GRID);
      const xb = Math.round(((i + 1) * CV) / GRID);
      const x1 = LO + ((HI - LO) * (i + 0.5)) / GRID;
      for (let j = 0; j < GRID; j++) {
        const ya = Math.round((j * CV) / GRID);
        const yb = Math.round(((j + 1) * CV) / GRID);
        const x2 = HI - ((HI - LO) * (j + 0.5)) / GRID;
        const { o } = predict(s.net, x1, x2, squash);
        if (!Number.isFinite(o)) continue;
        const c = Math.max(-1, Math.min(1, o));
        ctx.fillStyle =
          c >= 0
            ? `rgba(200, 88, 40, ${(c * 0.55).toFixed(3)})`
            : `rgba(52, 112, 158, ${(-c * 0.55).toFixed(3)})`;
        ctx.fillRect(xa, ya, xb - xa, yb - ya);
      }
    }
  };

  useEffect(() => {
    paint(cvLin.current, lin.current, false);
    paint(cvTan.current, tan.current, true);
  });

  const stats = (s: Side, squash: boolean) => {
    if (s.dead) return { loss: NaN, correct: 0, dead: true };
    const outs = PTS.map(([a, b]) => predict(s.net, a, b, squash).o);
    if (!outs.every(Number.isFinite)) return { loss: NaN, correct: 0, dead: true };
    return {
      loss: PTS.reduce((acc, [, , t], i) => acc + (outs[i] - t) ** 2, 0) / 4,
      correct: PTS.filter(([, , t], i) => Math.sign(outs[i]) === Math.sign(t)).length,
      dead: false,
    };
  };
  const sLin = stats(lin.current, false);
  const sTan = stats(tan.current, true);

  const sx = (x: number) => ((x - LO) / (HI - LO)) * CV;
  const sy = (x: number) => CV - ((x - LO) / (HI - LO)) * CV;

  const CW = 430;
  const CH = 118;
  const gx = (i: number, n: number) => (i / Math.max(n - 1, 1)) * CW;
  const gy = (l: number) => 100 - (Math.min(l, 1.6) / 1.6) * 84;
  const path = (h: number[]) =>
    h.length > 1 ? h.map((l, i) => `${gx(i, h.length).toFixed(1)},${gy(l).toFixed(1)}`).join(' ') : '';

  const panel = (
    label: string,
    sub: string,
    ref: RefObject<HTMLCanvasElement | null>,
    s: Side,
    st: ReturnType<typeof stats>,
    squash: boolean
  ) => (
    <div className="xr-panel">
      <div className="xr-head">
        <span className="xr-name">{label}</span>
        <span className="xr-sub">{sub}</span>
      </div>
      <div className="xr-stage">
        <canvas ref={ref} width={CV} height={CV} className="xr-canvas" />
        <svg viewBox={`0 0 ${CV} ${CV}`} className="xr-over" aria-hidden="true">
          {cuts &&
            !st.dead &&
            s.net.W1.map(([a, b], i) => {
              const c = s.net.b1[i];
              if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
              if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) return null;
              const p =
                Math.abs(b) >= Math.abs(a)
                  ? ([
                      [LO, -(a * LO + c) / b],
                      [HI, -(a * HI + c) / b],
                    ] as const)
                  : ([
                      [-(b * LO + c) / a, LO],
                      [-(b * HI + c) / a, HI],
                    ] as const);
              return (
                <line
                  key={i}
                  x1={sx(p[0][0])}
                  y1={sy(p[0][1])}
                  x2={sx(p[1][0])}
                  y2={sy(p[1][1])}
                  className="xr-cut"
                />
              );
            })}
          {PTS.map(([a, b, t], i) => (
            <g key={i}>
              <circle cx={sx(a)} cy={sy(b)} r={12} className={t > 0 ? 'xr-pt pos' : 'xr-pt neg'} />
              <text x={sx(a)} y={sy(b) + 4} className="xr-lab" textAnchor="middle">
                {t > 0 ? '1' : '0'}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="xr-stats">
        <span>
          loss <b>{st.dead ? 'blew up' : st.loss.toFixed(3)}</b>
        </span>
        <span>
          correct <b className={st.correct === 4 ? 'win' : ''}>{st.dead ? '—' : `${st.correct}/4`}</b>
        </span>
      </div>
      <p className={`xr-verdict ${st.correct === 4 && !st.dead ? 'win' : ''}`}>
        {st.dead
          ? 'Blew up — the learning rate is too large for this one.'
          : squash
            ? st.correct === 4
              ? 'Solved. The boundary bent around the dots.'
              : 'Bending…'
            : 'A flat ramp, whatever it does. It can never get past 3 of 4.'}
      </p>
    </div>
  );

  return (
    <div className="xr">
      <div className="xr-bar">
        <button type="button" className="xr-go" onClick={restart}>
          ↻ Replay
        </button>
        <span className="xr-epoch">
          step <b>{epoch.current}</b> / {MAX_EPOCH}
        </span>
        <span className="xr-prog">
          <span style={{ width: `${(100 * epoch.current) / MAX_EPOCH}%` }} />
        </span>
      </div>

      <div className="xr-row">
        {panel('no squash', 'two straight layers', cvLin, lin.current, sLin, false)}
        {panel('with tanh', 'plus a squash', cvTan, tan.current, sTan, true)}
        <div className="xr-chartbox">
          <svg viewBox={`0 0 ${CW} ${CH}`} className="xr-chart" role="img" aria-label="Loss over training for both networks">
        <line x1="0" y1={gy(1)} x2={CW} y2={gy(1)} className="xr-ref" />
        <text x={CW - 2} y={gy(1) - 5} className="xr-reftext" textAnchor="end">
          1.00 — ceiling for a straight ramp
        </text>
        <line x1="0" y1={gy(0)} x2={CW} y2={gy(0)} className="xr-base" />
        <text x="2" y={gy(0) + 12} className="xr-reftext">
          0
        </text>
        {path(lin.current.hist) && <polyline points={path(lin.current.hist)} className="xr-line lin" />}
        {path(tan.current.hist) && <polyline points={path(tan.current.hist)} className="xr-line tan" />}
        <g className="xr-legend">
          <line x1="4" y1="10" x2="24" y2="10" className="xr-line lin" />
          <text x="29" y="13">no squash</text>
          <line x1="104" y1="10" x2="124" y2="10" className="xr-line tan" />
          <text x="129" y="13">with tanh</text>
        </g>
          </svg>
        </div>
      </div>

      <div className="xr-ctrls">
        <div className="xr-ctl">
          <span>hidden units</span>
          <span className="xr-seg">
            {[2, 4, 8].map((h) => (
              <button key={h} type="button" className={H === h ? 'on' : ''} onClick={() => setH(h)}>
                {h}
              </button>
            ))}
          </span>
        </div>
        <div className="xr-ctl">
          <span>seed</span>
          <span className="xr-seg">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                className={seed === s ? 'on' : ''}
                onClick={() => setSeed(s)}
              >
                {s}
              </button>
            ))}
          </span>
        </div>
        <label className="xr-ctl">
          <span>
            learning rate <b>{lr.toFixed(2)}</b>
          </span>
          <input
            type="range"
            min={0.02}
            max={0.9}
            step={0.02}
            value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value))}
          />
        </label>
        <div className="xr-ctl">
          <span>overlay</span>
          <span className="xr-seg">
            <button type="button" className={cuts ? 'on' : ''} onClick={() => setCuts((c) => !c)}>
              each unit&rsquo;s cut
            </button>
          </span>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.xr { font-family: var(--font-sans); color: var(--ink-body); }
.xr-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.xr-bar button { font: inherit; font-size: 11.5px; font-family: var(--font-mono); padding: 6px 12px; border: 1px solid var(--line-2); background: var(--paper); color: var(--ink-2); border-radius: var(--radius-sm); cursor: pointer; }
.xr-bar button:hover { border-color: var(--accent); color: var(--accent); }
.xr-go { background: var(--ink) !important; border-color: var(--ink) !important; color: var(--paper) !important; }
.xr-epoch { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-3); }
.xr-epoch b { color: var(--ink); }
.xr-prog { flex: 1; min-width: 60px; height: 3px; background: var(--line); border-radius: 2px; overflow: hidden; }
.xr-prog span { display: block; height: 100%; background: var(--accent); }
.xr-row { display: grid; grid-template-columns: 190px 190px minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 720px) { .xr-row { grid-template-columns: 1fr 1fr; } .xr-chartbox { grid-column: 1 / -1; } }
@media (max-width: 420px) { .xr-row { grid-template-columns: 1fr; } }
.xr-panel { min-width: 0; }
.xr-head { display: flex; align-items: baseline; gap: 6px; margin-bottom: 5px; flex-wrap: wrap; }
.xr-name { font-family: var(--font-mono); font-size: 12px; color: var(--ink); font-weight: 600; }
.xr-sub { font-size: 10.5px; color: var(--ink-3); }
.xr-stage { position: relative; width: 100%; aspect-ratio: 1; border: 1px solid var(--line-2); border-radius: var(--radius-sm); overflow: hidden; }
.xr-canvas, .xr-over { position: absolute; inset: 0; width: 100%; height: 100%; }
.xr-pt { stroke: var(--paper); stroke-width: 2.5; }
.xr-pt.pos { fill: #c85828; }
.xr-pt.neg { fill: #34709e; }
.xr-lab { fill: #fff; font-size: 11px; font-family: var(--font-mono); font-weight: 600; }
.xr-cut { stroke: var(--ink); stroke-width: 1.4; stroke-dasharray: 4 3; opacity: .55; }
.xr-stats { display: flex; gap: 12px; margin-top: 6px; font-size: 10.5px; color: var(--ink-3); font-family: var(--font-mono); }
.xr-stats b { color: var(--ink); font-size: 12px; }
.xr-stats b.win { color: var(--tc-green); }
.xr-verdict { font-size: 11.5px; line-height: 1.4; color: var(--ink-2); margin: 4px 0 0; }
.xr-verdict.win { color: var(--tc-green); }
.xr-chartbox { padding-top: 20px; }
.xr-chart { width: 100%; height: auto; }
.xr-ref { stroke: var(--ink-4); stroke-width: 1; stroke-dasharray: 3 3; }
.xr-base { stroke: var(--line-2); stroke-width: 1; }
.xr-reftext { fill: var(--ink-3); font-size: 10px; font-family: var(--font-mono); }
.xr-line { fill: none; stroke-width: 2; }
.xr-line.lin { stroke: var(--ink-3); stroke-dasharray: 5 4; }
.xr-line.tan { stroke: var(--accent); }
.xr-legend text { fill: var(--ink-3); font-size: 10px; font-family: var(--font-mono); }
.xr-ctrls { display: flex; flex-wrap: wrap; gap: 12px 20px; margin-top: 14px; align-items: end; }
.xr-ctl { display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; color: var(--ink-3); }
.xr-ctl b { font-family: var(--font-mono); color: var(--ink); }
.xr-ctl input[type=range] { width: 150px; accent-color: var(--accent); }
.xr-seg { display: flex; gap: 5px; }
.xr-seg button { font: inherit; font-size: 11.5px; font-family: var(--font-mono); padding: 5px 10px; border: 1px solid var(--line-2); background: var(--paper); color: var(--ink-2); border-radius: var(--radius-sm); cursor: pointer; }
.xr-seg button:hover { border-color: var(--accent); color: var(--accent); }
.xr-seg button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.xr-seg button.on:hover { color: #fff; }
`;
