'use client';

import SystemsFlow from './SystemsFlow';
import { useState, useEffect, useMemo, useRef, type ComponentType } from 'react';

function useAnimationFrame(active: boolean) {
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now() - tRef.current * 1000;
    const tick = (now: number) => {
      tRef.current = (now - start) / 1000;
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
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
  // Build the causal triangle in under two seconds, then scan the completed rows.
  const reveal = t / 0.14;
  const scan = t < 1.96 ? reveal : ((t - 1.96) % 2.8) / 0.2;
  const activeRow = Math.max(0, Math.min(N - 1, Math.floor(scan)));

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
          fill="var(--ink-2)"
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
          fill={i === activeRow ? 'var(--accent)' : 'var(--ink-2)'}
          fontWeight={i === activeRow ? 700 : 400}
          textAnchor="end"
        >
          {tok}
        </text>
      ))}
      {pattern.map((row, i) =>
        row.map((v, j) => {
          const entrance = Math.max(0, Math.min(1, (reveal - i) * 2));
          const highlight = Math.max(0, 1 - Math.abs(i - scan));
          const opacity = entrance * Math.min(1, v * 0.65 + (v > 0 ? highlight * 0.5 : 0));
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
        x={0}
        y={activeRow * cell}
        width={(activeRow + 1) * cell - 1}
        height={cell - 1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
        opacity="0.7"
        rx="1"
      />
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
        fill="var(--ink-2)"
        textAnchor="middle"
      >
        key positions →
      </text>
      <text
        x={-58}
        y={size / 2}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-2)"
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
  const progress = Math.min(1, t / 5);
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
            fill="var(--ink-2)"
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
          fill="var(--ink-2)"
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
            fill="var(--ink-2)"
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
          FP4 example
        </text>
        <line x1="8" y1="28" x2="22" y2="28" stroke="var(--ink-2)" strokeWidth="1.5" />
        <text x="26" y="31" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-2)">
          FP8 example
        </text>
        <line x1="8" y1="43" x2="22" y2="43" stroke="var(--ink-3)" strokeWidth="1.5" />
        <text x="26" y="46" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-2)">
          BF16 example
        </text>
      </g>
      <text
        x={W / 2}
        y={H - 4}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-2)"
        textAnchor="middle"
      >
        training step
      </text>
      <text
        x={12}
        y={H / 2}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-2)"
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
            fill="var(--ink-2)"
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
        fill="var(--ink-2)"
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
        stroke="var(--ink-3)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      {clusters.map((c, ci) => (
        <g key={c.label}>
          {c.pts.map((p, pi) => {
            const drift = Math.sin(t * 1.0 + p.phase) * 0.008;
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
        fill="var(--ink-2)"
        textAnchor="middle"
      >
        UMAP dim 1
      </text>
      <text
        x={12}
        y={H / 2 - 18}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--ink-2)"
        textAnchor="middle"
        transform={`rotate(-90 12 ${H / 2 - 18})`}
      >
        UMAP dim 2
      </text>
    </svg>
  );
}

const FIGS = [
  {
    label: 'Layers',
    caption:
      'A schematic inference step: model operations become scheduled kernels, the GPU executes them, and the resulting scores are used to sample the next token.',
    Comp: SystemsFlow,
  },
  {
    label: 'Attention',
    caption:
      'A single attention head over one sentence, showing a causal mask, a repeated-token pattern, and attention concentrated on the first token.',
    Comp: AttentionFig,
  },
  {
    label: 'Training',
    caption:
      'Example training-loss curves for FP4, FP8, and BF16, showing how different precision settings can affect convergence over a training run.',
    Comp: LossFig,
  },
  {
    label: 'Throughput',
    caption:
      'An example comparison of tokens per second across precision and serving strategies, from a BF16 baseline to batching and speculative decoding.',
    Comp: ThroughputFig,
  },
  {
    label: 'Embeddings',
    caption:
      'A schematic embedding map, colored by prompt type. Nearby points represent similar inputs across code, math, prose, and dialogue.',
    Comp: EmbeddingFig,
  },
];

function AnimatedScene({
  Comp,
  active,
  reducedMotion,
}: {
  Comp: ComponentType<{ t: number }>;
  active: boolean;
  reducedMotion: boolean;
}) {
  const t = useAnimationFrame(active);
  return <Comp t={reducedMotion ? 5 : t} />;
}

export default function HeroFigure() {
  const [{ idx, previous }, setScene] = useState<{ idx: number; previous: number | null }>({
    idx: 0,
    previous: null,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [touchControls, setTouchControls] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!rootRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);
  const active = !reducedMotion && !paused && !hintOpen && pageVisible && onScreen;
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(
      () => setScene(({ idx }) => ({ idx: (idx + 1) % FIGS.length, previous: idx })),
      6000,
    );
    return () => clearInterval(interval);
  }, [active, idx]);
  useEffect(() => {
    if (previous === null) return;
    const timeout = setTimeout(() => setScene((scene) => ({ ...scene, previous: null })), 750);
    return () => clearTimeout(timeout);
  }, [previous]);
  useEffect(() => {
    if (!touchControls) return;
    const timer = setTimeout(() => setTouchControls(false), 5000);
    return () => clearTimeout(timer);
  }, [touchControls]);
  const moveScene = (direction: number) => {
    setHintOpen(false);
    setScene(({ idx }) => ({ idx: (idx + direction + FIGS.length) % FIGS.length, previous: idx }));
  };
  return (
    <div
      className="hero-showcase"
      data-motion={active ? 'running' : 'paused'}
      data-controls={touchControls ? 'visible' : undefined}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch') setTouchControls(true);
      }}
      ref={rootRef}
      role="group"
      aria-label="Machine learning systems illustrations"
    >
      <div className="hero-scenes">
        {FIGS.map(({ label, Comp }, i) => (
          <div
            key={label}
            className={`hero-scene${i === idx ? ' is-current' : ''}`}
            aria-hidden={i !== idx}
          >
            {(i === idx || i === previous) && (
              <div role="img" aria-label={FIGS[i].caption}>
                <AnimatedScene Comp={Comp} active={active} reducedMotion={reducedMotion} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="hero-scene-controls">
        <button type="button" aria-label="Previous illustration" onClick={() => moveScene(-1)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <path d="M15 10H5m5-5-5 5 5 5" />
          </svg>
        </button>
        <div
          className="hero-scene-info"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setHintOpen(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHintOpen(false);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setHintOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setHintOpen(false);
            }
          }}
        >
          <button
            type="button"
            aria-label="About this illustration"
            aria-expanded={hintOpen}
            aria-controls="hero-illustration-hint"
            onClick={() => setHintOpen((open) => !open)}
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible')) setHintOpen(true);
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 9v5" />
              <circle cx="10" cy="6" r=".7" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <p id="hero-illustration-hint" className="hero-illustration-hint" hidden={!hintOpen}>
            {FIGS[idx].caption}
          </p>
        </div>
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Resume illustrations' : 'Pause illustrations'}
            title={paused ? 'Resume illustrations' : 'Pause illustrations'}
          >
            {paused ? '▷' : 'Ⅱ'}
          </button>
        )}
        <button type="button" aria-label="Next illustration" onClick={() => moveScene(1)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <path d="M5 10h10m-5-5 5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
