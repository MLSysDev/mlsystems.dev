'use client';

import { useState, useEffect } from 'react';
import type { Tool } from '@/lib/data';
import { AttentionFig } from './HeroFigure';

export default function Playground({ tools }: { tools: Tool[] }) {
  const [active, setActive] = useState('throughput-calc');

  return (
    <div className="playground-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, marginTop: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => t.available && setActive(t.id)}
            disabled={!t.available}
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              background: active === t.id ? 'var(--paper-2)' : 'transparent',
              border: '1px solid ' + (active === t.id ? 'var(--line-2)' : 'transparent'),
              borderRadius: 6,
              cursor: t.available ? 'pointer' : 'default',
              opacity: t.available ? 1 : 0.5,
              color: 'inherit',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{t.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.available ? 'var(--accent)' : 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                · {t.tag}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper-2)', padding: 32, minHeight: 540 }}>
        {active === 'throughput-calc' && <ThroughputCalc />}
        {active === 'attention-viz' && <AttentionVizTool />}
        {active === 'cost-calc' && <CostCalc />}
      </div>
    </div>
  );
}

// --- Throughput Calculator ---

const GPU_SPECS = {
  h100: { name: 'H100 SXM', mem: 80, bw: 3350, tflops: { bf16: 989, fp8: 1979, fp4: 1979 } },
  h200: { name: 'H200', mem: 141, bw: 4800, tflops: { bf16: 989, fp8: 1979, fp4: 1979 } },
  b200: { name: 'B200', mem: 192, bw: 8000, tflops: { bf16: 2250, fp8: 4500, fp4: 9000 } },
  a100: { name: 'A100 80GB', mem: 80, bw: 2039, tflops: { bf16: 312, fp8: 0, fp4: 0 } },
};
const PREC_BYTES = { bf16: 2, fp8: 1, fp4: 0.5 };
type GPU = keyof typeof GPU_SPECS;
type Precision = keyof typeof PREC_BYTES;

function ThroughputCalc() {
  const [model, setModel] = useState(70);
  const [precision, setPrecision] = useState<Precision>('fp8');
  const [batchSize, setBatchSize] = useState(8);
  const [seqLen, setSeqLen] = useState(4096);
  const [gpu, setGpu] = useState<GPU>('h100');

  const spec = GPU_SPECS[gpu];
  const paramBytes = model * 1e9 * PREC_BYTES[precision];
  const kvBytes = batchSize * 4 * 80 * 64 * 128 * seqLen;
  const totalMem = (paramBytes + kvBytes) / 1e9;
  const fits = totalMem < spec.mem * 0.85;
  const memBoundTps = (spec.bw * 1e9) / paramBytes;
  const tps = memBoundTps * batchSize * (precision === 'fp4' ? 1.5 : 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0, fontWeight: 400 }}>Throughput Calculator</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>· LIVE</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 32px' }}>
        Back-of-envelope tokens/sec for a given model, precision, and hardware.
        Memory-bound regime only; assumes batched serving with a healthy KV cache headroom.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 32 }}>
        <Field label="Model size" value={`${model}B params`}>
          <input type="range" min={1} max={405} value={model} onChange={(e) => setModel(+e.target.value)} style={{ width: '100%' }} />
        </Field>
        <Field label="Batch size" value={`${batchSize}`}>
          <input type="range" min={1} max={64} value={batchSize} onChange={(e) => setBatchSize(+e.target.value)} style={{ width: '100%' }} />
        </Field>
        <Field label="Sequence length" value={`${seqLen} tokens`}>
          <input type="range" min={512} max={32768} step={512} value={seqLen} onChange={(e) => setSeqLen(+e.target.value)} style={{ width: '100%' }} />
        </Field>
        <Field label="Precision">
          <div style={{ display: 'flex', gap: 4 }}>
            {(['bf16', 'fp8', 'fp4'] as Precision[]).map((p) => (
              <button key={p} className={`filter-chip ${precision === p ? 'active' : ''}`} onClick={() => setPrecision(p)}>{p}</button>
            ))}
          </div>
        </Field>
        <Field label="GPU">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(GPU_SPECS).map(([k, v]) => (
              <button key={k} className={`filter-chip ${gpu === k ? 'active' : ''}`} onClick={() => setGpu(k as GPU)}>{v.name}</button>
            ))}
          </div>
        </Field>
      </div>

      <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 24, background: 'var(--paper)' }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Estimate</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Stat label="Tokens / sec / GPU" value={Math.round(tps).toLocaleString()} accent />
          <Stat label="Memory required" value={`${totalMem.toFixed(1)} GB`} warn={!fits} />
          <Stat label="Fits on 1 GPU?" value={fits ? 'yes' : 'needs sharding'} warn={!fits} />
        </div>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <Row label={`Param memory (${precision})`} value={`${(paramBytes / 1e9).toFixed(1)} GB`} />
          <Row label={`KV cache @ batch=${batchSize}, seq=${seqLen}`} value={`${(kvBytes / 1e9).toFixed(1)} GB`} />
          <Row label={`HBM bandwidth (${spec.name})`} value={`${spec.bw} GB/s`} />
          <Row label={`Compute @ ${precision}`} value={`${spec.tflops[precision]} TFLOPS`} />
        </div>
        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          ⚠ Estimate is memory-bound roofline only. Actual numbers depend on kernel quality,
          continuous batching, speculative decoding, and a dozen other things this tool
          doesn&apos;t model.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span>{label}</span>
        {value && <span style={{ color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 36,
        lineHeight: 1,
        fontWeight: 400,
        color: accent ? 'var(--accent)' : warn ? '#c2410c' : 'var(--ink)',
      }}>{value}</div>
    </div>
  );
}

// --- Attention Visualizer ---

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

function AttentionVizTool() {
  const [model, setModel] = useState('llama-7b');
  const [layer, setLayer] = useState(14);
  const [head, setHead] = useState(3);
  const [prompt, setPrompt] = useState('The cat sat on the mat and the dog ran past him.');
  const t = useAnimationFrame();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0, fontWeight: 400 }}>Attention Visualizer</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>· LIVE</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>
        Inspect attention patterns for any model. Drag prompts in, scrub layers and heads.
      </p>
      <Field label="Model">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['llama-7b', 'llama-70b', 'mistral-7b', 'qwen-72b'].map((m) => (
            <button key={m} className={`filter-chip ${model === m ? 'active' : ''}`} onClick={() => setModel(m)}>{m}</button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Field label="Layer" value={`${layer} / 32`}>
          <input type="range" min={0} max={31} value={layer} onChange={(e) => setLayer(+e.target.value)} style={{ width: '100%' }} />
        </Field>
        <Field label="Head" value={`${head} / 32`}>
          <input type="range" min={0} max={31} value={head} onChange={(e) => setHead(+e.target.value)} style={{ width: '100%' }} />
        </Field>
      </div>
      <div style={{ marginTop: 16 }}>
        <Field label="Prompt">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', background: 'var(--paper)',
              border: '1px solid var(--line-2)', borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)',
            }}
          />
        </Field>
      </div>
      <div style={{ marginTop: 24, border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)', height: 320 }}>
        <AttentionFig t={t + layer * 0.5 + head * 0.3} />
      </div>
    </div>
  );
}

// --- Cost Calc ---

const PROVIDERS = [
  { name: 'OpenAI gpt-4o', inputCost: 2.50, outputCost: 10.00 },
  { name: 'Anthropic Sonnet', inputCost: 3.00, outputCost: 15.00 },
  { name: 'Together Llama-70B', inputCost: 0.88, outputCost: 0.88 },
  { name: 'Self-hosted (8x H100)', inputCost: 0.18, outputCost: 0.18 },
];

function CostCalc() {
  const [tokens, setTokens] = useState(100);
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 8px', fontWeight: 400 }}>Inference Cost Calculator</h2>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>Compare provider pricing at your traffic volume.</p>
      <Field label="Monthly tokens (millions)" value={`${tokens}M`}>
        <input type="range" min={1} max={10000} value={tokens} onChange={(e) => setTokens(+e.target.value)} style={{ width: '100%' }} />
      </Field>
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROVIDERS.map((p) => {
          const cost = ((p.inputCost + p.outputCost) / 2) * tokens;
          const maxCost = ((PROVIDERS[0].inputCost + PROVIDERS[0].outputCost) / 2) * tokens;
          const width = Math.min(100, (cost / maxCost) * 100);
          const isSelf = p.name.includes('Self-hosted');
          return (
            <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
              <div style={{ height: 24, background: 'var(--paper-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${width}%`, height: '100%', background: isSelf ? 'var(--accent)' : 'var(--ink-3)', transition: 'width 0.2s' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, textAlign: 'right', fontWeight: 500 }}>
                ${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
