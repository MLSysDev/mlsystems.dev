'use client';

import { useState } from 'react';
import { Field, Stat, StatRow } from '@/components/playground/primitives';

const GPU_SPECS = {
  h100: { name: 'H100 SXM', mem: 80, bw: 3350 },
  h200: { name: 'H200', mem: 141, bw: 4800 },
  b200: { name: 'B200', mem: 192, bw: 8000 },
  a100: { name: 'A100 80GB', mem: 80, bw: 2039 },
};
const PREC_BYTES = { bf16: 2, fp8: 1, fp4: 0.5 };
type GPU = keyof typeof GPU_SPECS;
type Precision = keyof typeof PREC_BYTES;

export default function ThroughputCalc({ compact = false }: { compact?: boolean }) {
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
  const tps = memBoundTps * batchSize;

  return (
    <div>
      {!compact && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                margin: 0,
                fontWeight: 400,
              }}
            >
              Throughput Calculator
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
              · LIVE
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 32px' }}>
            A weight-bandwidth ceiling, not measured throughput. KV memory uses a fixed example: 80
            layers, 64 KV heads, head dimension 128, and BF16 cache. Model size changes weights
            only.
          </p>
        </>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <Field label="Model size" value={`${model}B params`}>
          <input
            aria-label="Model size"
            type="range"
            min={1}
            max={405}
            value={model}
            onChange={(e) => setModel(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Batch size" value={`${batchSize}`}>
          <input
            aria-label="Batch size"
            type="range"
            min={1}
            max={64}
            value={batchSize}
            onChange={(e) => setBatchSize(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Sequence length" value={`${seqLen} tokens`}>
          <input
            aria-label="Sequence length"
            type="range"
            min={512}
            max={32768}
            step={512}
            value={seqLen}
            onChange={(e) => setSeqLen(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Precision">
          <div style={{ display: 'flex', gap: 4 }}>
            {(['bf16', 'fp8', 'fp4'] as Precision[]).map((p) => (
              <button
                key={p}
                className={`filter-chip ${precision === p ? 'active' : ''}`}
                onClick={() => setPrecision(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>
        <Field label="GPU">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(GPU_SPECS).map(([k, v]) => (
              <button
                key={k}
                className={`filter-chip ${gpu === k ? 'active' : ''}`}
                onClick={() => setGpu(k as GPU)}
              >
                {v.name}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div
        style={{
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          padding: 24,
          background: 'var(--paper)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Estimate
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 16,
          }}
        >
          <Stat
            label="Weight-read ceiling (tokens/sec)"
            value={Math.round(tps).toLocaleString()}
            accent
          />
          <Stat label="Example memory" value={`${totalMem.toFixed(1)} GB`} warn={!fits} />
          <Stat
            label="Example fits on 1 GPU?"
            value={fits ? 'yes' : 'needs sharding'}
            warn={!fits}
          />
        </div>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <StatRow
            label={`Param memory (${precision})`}
            value={`${(paramBytes / 1e9).toFixed(1)} GB`}
          />
          <StatRow
            label={`KV cache @ batch=${batchSize}, seq=${seqLen}`}
            value={`${(kvBytes / 1e9).toFixed(1)} GB`}
          />
          <StatRow label={`HBM bandwidth (${spec.name})`} value={`${spec.bw} GB/s`} />
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          ⚠ The ceiling ignores KV-cache traffic and compute limits. Precision describes weight
          storage, not native GPU support. Actual numbers depend on kernel quality, continuous
          batching, speculative decoding, and a dozen other things this tool doesn&apos;t model.
        </div>
      </div>
    </div>
  );
}
