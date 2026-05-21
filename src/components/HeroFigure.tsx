'use client';

import { useState, useEffect, useMemo } from 'react';

function useAnimationFrame() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

export function AttentionFig({ t }: { t: number }) {
  const N = 14;
  const pattern = useMemo(() => {
    const out: number[][] = [];
    for (let i = 0; i < N; i++) {
      const row: number[] = [];
      for (let j = 0; j < N; j++) {
        const causal = j <= i ? 1 : 0;
        const diag = Math.exp(-Math.abs(i - j) / 2.5);
        const focusBOS = j === 0 ? 0.6 : 0;
        const focus = j === 3 || j === 7 || j === 10 ? 0.4 * Math.exp(-Math.abs(i - j) / 6) : 0;
        const induction = i - j === 4 ? 0.5 : 0;
        const base = causal * (0.05 + diag * 0.5 + focusBOS + focus + induction);
        row.push(Math.min(1, base));
      }
      out.push(row);
    }
    return out;
  }, []);

  const tokens = [
    'the',
    'cat',
    'sat',
    'on',
    'the',
    'mat',
    'and',
    'the',
    'dog',
    'ran',
    'past',
    'him',
    '.',
    '[EOS]',
  ];
  const cell = 22;
  const size = N * cell;

  return (
    <svg
      viewBox={`-78 -36 ${size + 120} ${size + 70}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {tokens.slice(0, N).map((tok, j) => (
        <text
          key={j}
          x={j * cell + cell / 2}
          y={-12}
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
          textAnchor="middle"
          transform={`rotate(-30 ${j * cell + cell / 2} -12)`}
        >
          {tok}
        </text>
      ))}
      {tokens.slice(0, N).map((tok, i) => (
        <text
          key={i}
          x={-8}
          y={i * cell + cell / 2 + 3}
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
          textAnchor="end"
        >
          {tok}
        </text>
      ))}
      {pattern.map((row, i) =>
        row.map((v, j) => {
          const phase = Math.sin(t * 1.2 + i * 0.3 + j * 0.15) * 0.5 + 0.5;
          const opacity = v * (0.55 + 0.45 * phase);
          return (
            <rect
              key={`${i}-${j}`}
              x={j * cell}
              y={i * cell}
              width={cell - 1}
              height={cell - 1}
              fill="var(--accent)"
              opacity={opacity}
              rx="1"
            />
          );
        }),
      )}
      <rect
        x={-0.5}
        y={-0.5}
        width={size + 1}
        height={size + 1}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth="0.5"
      />
      <text
        x={size / 2}
        y={size + 26}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
      >
        key positions →
      </text>
      <text
        x={-58}
        y={size / 2}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
        transform={`rotate(-90 -58 ${size / 2})`}
      >
        ← query positions
      </text>
    </svg>
  );
}

function LossFig({ t }: { t: number }) {
  const W = 360,
    H = 280;
  const margin = { l: 56, r: 24, t: 16, b: 40 };
  const innerW = W - margin.l - margin.r;
  const innerH = H - margin.t - margin.b;

  const runs = useMemo(() => {
    const N = 80;
    const baseline: number[] = [],
      methodA: number[] = [],
      methodB: number[] = [];
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const noise = (s: number) =>
        (Math.sin(i * s + s * 100) * 0.5 + Math.sin(i * (s + 0.3)) * 0.3) * 0.06;
      baseline.push(2.4 * Math.exp(-x * 1.2) + 0.35 + noise(0.8));
      methodA.push(2.4 * Math.exp(-x * 1.7) + 0.28 + noise(1.1));
      methodB.push(2.4 * Math.exp(-x * 2.2) + 0.22 + noise(1.4));
    }
    return { baseline, methodA, methodB };
  }, []);

  const maxY = 3.0,
    minY = 0.15;
  const sx = (i: number) => margin.l + (i / 79) * innerW;
  const sy = (y: number) => margin.t + ((maxY - y) / (maxY - minY)) * innerH;
  const progress = Math.min(1, (t % 12) / 8);
  const visibleN = Math.floor(80 * progress);
  const linePath = (arr: number[]) =>
    arr
      .slice(0, visibleN)
      .map((y, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(y)}`)
      .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {[0.5, 1.0, 1.5, 2.0, 2.5].map((y) => (
        <g key={y}>
          <line
            x1={margin.l}
            y1={sy(y)}
            x2={W - margin.r}
            y2={sy(y)}
            stroke="var(--line)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
          <text
            x={margin.l - 8}
            y={sy(y) + 3}
            fontSize="9"
            fontFamily="var(--font-mono)"
            fill="var(--ink-3)"
            textAnchor="end"
          >
            {y.toFixed(1)}
          </text>
        </g>
      ))}
      {[0, 10, 20, 30, 40].map((k) => (
        <text
          key={k}
          x={margin.l + (k / 40) * innerW}
          y={H - margin.b + 16}
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
          textAnchor="middle"
        >
          {k}k
        </text>
      ))}
      <line
        x1={margin.l}
        y1={margin.t}
        x2={margin.l}
        y2={H - margin.b}
        stroke="var(--ink-3)"
        strokeWidth="0.5"
      />
      <line
        x1={margin.l}
        y1={H - margin.b}
        x2={W - margin.r}
        y2={H - margin.b}
        stroke="var(--ink-3)"
        strokeWidth="0.5"
      />
      <path
        d={linePath(runs.baseline)}
        stroke="var(--ink-3)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={linePath(runs.methodA)}
        stroke="var(--ink-2)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={linePath(runs.methodB)}
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {visibleN > 1 && (
        <>
          <circle
            cx={sx(visibleN - 1)}
            cy={sy(runs.baseline[visibleN - 1])}
            r="2.5"
            fill="var(--ink-3)"
          />
          <circle
            cx={sx(visibleN - 1)}
            cy={sy(runs.methodA[visibleN - 1])}
            r="2.5"
            fill="var(--ink-2)"
          />
          <circle
            cx={sx(visibleN - 1)}
            cy={sy(runs.methodB[visibleN - 1])}
            r="3"
            fill="var(--accent)"
          />
        </>
      )}
      <g transform={`translate(${W - margin.r - 110}, ${margin.t + 6})`}>
        <rect
          x="0"
          y="0"
          width="110"
          height="50"
          fill="var(--paper)"
          stroke="var(--line)"
          strokeWidth="0.5"
        />
        <line x1="8" y1="13" x2="22" y2="13" stroke="var(--accent)" strokeWidth="2" />
        <text x="26" y="16" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-2)">
          ours (FP4)
        </text>
        <line x1="8" y1="28" x2="22" y2="28" stroke="var(--ink-2)" strokeWidth="1.5" />
        <text x="26" y="31" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-2)">
          FP8 baseline
        </text>
        <line x1="8" y1="43" x2="22" y2="43" stroke="var(--ink-3)" strokeWidth="1.5" />
        <text x="26" y="46" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-2)">
          BF16 ref.
        </text>
      </g>
      <text
        x={W / 2}
        y={H - 4}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
      >
        training step
      </text>
      <text
        x={12}
        y={H / 2}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
        transform={`rotate(-90 12 ${H / 2})`}
      >
        train loss
      </text>
    </svg>
  );
}

function ThroughputFig({ t }: { t: number }) {
  // Wider viewBox so long labels on the left don't get clipped.
  const W = 440,
    H = 280;
  const margin = { l: 130, r: 40, t: 16, b: 40 };
  const innerW = W - margin.l - margin.r;
  const innerH = H - margin.t - margin.b;

  const configs = [
    { label: 'BF16, bs=1', base: 32, color: 'var(--ink-4)' },
    { label: 'BF16, bs=8', base: 168, color: 'var(--ink-3)' },
    { label: 'FP8, bs=8', base: 274, color: 'var(--ink-2)' },
    { label: 'FP8 + cont. batch', base: 412, color: 'var(--ink-2)' },
    { label: 'FP8 + spec. decode', base: 580, color: 'var(--ink)' },
    { label: 'FP4 + spec. decode', base: 742, color: 'var(--accent)' },
  ];

  const max = 800;
  const barH = innerH / configs.length - 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {[0, 200, 400, 600, 800].map((x) => (
        <g key={x}>
          <line
            x1={margin.l + (x / max) * innerW}
            y1={margin.t}
            x2={margin.l + (x / max) * innerW}
            y2={H - margin.b}
            stroke="var(--line)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
          <text
            x={margin.l + (x / max) * innerW}
            y={H - margin.b + 16}
            fontSize="9"
            fontFamily="var(--font-mono)"
            fill="var(--ink-3)"
            textAnchor="middle"
          >
            {x}
          </text>
        </g>
      ))}
      {configs.map((c, i) => {
        const wobble = Math.sin(t * 1.5 + i * 0.7) * 6 + Math.sin(t * 2.3 + i) * 3;
        const v = c.base + wobble;
        const y = margin.t + i * (barH + 8) + 4;
        const w = (v / max) * innerW;
        return (
          <g key={c.label}>
            <text
              x={margin.l - 8}
              y={y + barH / 2 + 3}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--ink-2)"
              textAnchor="end"
            >
              {c.label}
            </text>
            <rect x={margin.l} y={y} width={w} height={barH} fill={c.color} rx="1" />
            <text
              x={margin.l + w + 6}
              y={y + barH / 2 + 3}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill={c.color === 'var(--accent)' ? 'var(--accent)' : 'var(--ink-2)'}
            >
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      <line
        x1={margin.l}
        y1={margin.t}
        x2={margin.l}
        y2={H - margin.b}
        stroke="var(--ink-3)"
        strokeWidth="0.5"
      />
      <line
        x1={margin.l}
        y1={H - margin.b}
        x2={W - margin.r}
        y2={H - margin.b}
        stroke="var(--ink-3)"
        strokeWidth="0.5"
      />
      <text
        x={margin.l + innerW / 2}
        y={H - 4}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
      >
        tokens / second / GPU (H100, Llama-70B)
      </text>
    </svg>
  );
}

function EmbeddingFig({ t }: { t: number }) {
  const W = 360,
    H = 280;
  // unused but kept for parity with other figs
  void W;
  void H;
  const clusters = useMemo(() => {
    const centers = [
      { x: 0.25, y: 0.3, label: 'code', n: 40 },
      { x: 0.72, y: 0.28, label: 'math', n: 35 },
      { x: 0.48, y: 0.68, label: 'prose', n: 50 },
      { x: 0.78, y: 0.74, label: 'dialog', n: 30 },
    ];
    return centers.map((c) => {
      const pts: { x: number; y: number; phase: number }[] = [];
      let s = c.x * 1000 + c.y * 100;
      const rnd = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      for (let i = 0; i < c.n; i++) {
        const angle = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * 0.08;
        pts.push({
          x: c.x + Math.cos(angle) * r,
          y: c.y + Math.sin(angle) * r,
          phase: rnd() * Math.PI * 2,
        });
      }
      return { ...c, pts };
    });
  }, []);

  const colors = ['var(--ink-3)', 'var(--ink-2)', 'var(--accent)', 'var(--ink-2)'];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect
        x="20"
        y="14"
        width={W - 30}
        height={H - 50}
        fill="none"
        stroke="var(--line)"
        strokeWidth="0.5"
        strokeDasharray="3 4"
      />
      {clusters.map((c, ci) => (
        <g key={c.label}>
          {c.pts.map((p, pi) => {
            const drift = Math.sin(t * 0.6 + p.phase) * 0.008;
            const cx = 20 + (p.x + drift) * (W - 30);
            const cy = 14 + (p.y + drift) * (H - 50);
            return <circle key={pi} cx={cx} cy={cy} r="2.2" fill={colors[ci]} opacity="0.85" />;
          })}
          <text
            x={20 + c.x * (W - 30)}
            y={14 + (c.y - 0.13) * (H - 50)}
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill={colors[ci]}
            textAnchor="middle"
            fontWeight="500"
          >
            {c.label}
          </text>
        </g>
      ))}
      <text
        x={W / 2}
        y={H - 4}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
      >
        UMAP dim 1
      </text>
      <text
        x={12}
        y={H / 2 - 18}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        textAnchor="middle"
        transform={`rotate(-90 12 ${H / 2 - 18})`}
      >
        UMAP dim 2
      </text>
    </svg>
  );
}

export default function HeroFigure() {
  const FIGS = [
    {
      id: 'attn',
      label: 'Attention',
      Comp: AttentionFig,
      caption:
        'Per-head attention pattern at layer 14. Causal mask + induction circuit + sink token, visualized over one sentence.',
    },
    {
      id: 'loss',
      label: 'Loss',
      Comp: LossFig,
      caption:
        'Train loss across three precision regimes on a 7B run. FP4 closes the gap with BF16 once calibration is right.',
    },
    {
      id: 'tput',
      label: 'Throughput',
      Comp: ThroughputFig,
      caption:
        'Tokens per second per GPU for Llama-70B, by precision and serving strategy. Continuous batching is doing most of the work.',
    },
    {
      id: 'embed',
      label: 'Embeddings',
      Comp: EmbeddingFig,
      caption:
        "UMAP projection of an instruction-tuned model's final-layer embeddings, colored by prompt type. Clusters emerge without supervision.",
    },
  ];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const cycleMs = 9000;
    const interval = setInterval(() => setIdx((i) => (i + 1) % FIGS.length), cycleMs);
    return () => clearInterval(interval);
  }, [FIGS.length]);

  const t = useAnimationFrame();
  const current = FIGS[idx];
  const Comp = current.Comp;

  return (
    <div className="figure">
      <div className="figure-head">
        <div className="figure-head-tabs">
          {FIGS.map((f, i) => (
            <button key={f.id} className={i === idx ? 'active' : ''} onClick={() => setIdx(i)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="figure-body" key={current.id}>
        <div style={{ width: '100%', height: '100%', animation: 'figureFade 0.5s ease-out' }}>
          <Comp t={t} />
        </div>
      </div>
      <div className="figure-caption">
        <span className="fig-label">
          FIG. {idx + 1}.{idx + 1}
        </span>
        {current.caption}
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 4 }}>
        {FIGS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 2,
              background: i === idx ? 'var(--accent)' : 'var(--line-2)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
