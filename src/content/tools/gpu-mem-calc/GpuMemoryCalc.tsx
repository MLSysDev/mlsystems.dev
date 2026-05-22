'use client';

import { useMemo, useState } from 'react';
import { Field, Stat, StatRow } from '@/components/playground/primitives';

// Reference architectures with verified configs. Sourced from official model cards.
// hidden = d_model, layers = num_hidden_layers, heads = num_attention_heads,
// kv_heads = num_key_value_heads (GQA), head_dim = hidden / heads (unless overridden).
const MODELS = {
  'llama3-8b': {
    label: 'LLaMA 3 8B',
    params: 8.03e9,
    hidden: 4096,
    layers: 32,
    heads: 32,
    kvHeads: 8,
    headDim: 128,
  },
  'llama3-70b': {
    label: 'LLaMA 3 70B',
    params: 70.6e9,
    hidden: 8192,
    layers: 80,
    heads: 64,
    kvHeads: 8,
    headDim: 128,
  },
  'mistral-7b': {
    label: 'Mistral 7B',
    params: 7.24e9,
    hidden: 4096,
    layers: 32,
    heads: 32,
    kvHeads: 8,
    headDim: 128,
  },
  'qwen-72b': {
    label: 'Qwen2.5 72B',
    params: 72.7e9,
    hidden: 8192,
    layers: 80,
    heads: 64,
    kvHeads: 8,
    headDim: 128,
  },
  custom: {
    label: 'Custom',
    params: 7e9,
    hidden: 4096,
    layers: 32,
    heads: 32,
    kvHeads: 8,
    headDim: 128,
  },
} as const;
type ModelKey = keyof typeof MODELS;

const PARAM_BYTES = { bf16: 2, fp16: 2, fp8: 1, fp4: 0.5 } as const;
type ParamDtype = keyof typeof PARAM_BYTES;

type Mode = 'training' | 'inference';
type Optimizer = 'adam' | 'adam-8bit' | 'sgd';
type Recompute = 'none' | 'selective' | 'full';
type ZeroStage = 'none' | 'zero1' | 'zero2' | 'zero3';

function bytesToGB(b: number) {
  return b / 1e9;
}
function fmt(n: number, digits = 1) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toFixed(digits);
}

export default function GpuMemoryCalc({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('training');
  const [modelKey, setModelKey] = useState<ModelKey>('llama3-8b');
  const [paramDtype, setParamDtype] = useState<ParamDtype>('bf16');
  const [batch, setBatch] = useState(1);
  const [seqLen, setSeqLen] = useState(4096);
  const [optimizer, setOptimizer] = useState<Optimizer>('adam');
  const [recompute, setRecompute] = useState<Recompute>('selective');
  const [zero, setZero] = useState<ZeroStage>('none');
  const [worldSize, setWorldSize] = useState(8);

  // Optional override for custom model
  const [customParamsB, setCustomParamsB] = useState(7);

  const arch = useMemo(() => {
    if (modelKey === 'custom') {
      const N = customParamsB * 1e9;
      return { ...MODELS.custom, params: N };
    }
    return MODELS[modelKey];
  }, [modelKey, customParamsB]);

  // ── Params memory ──────────────────────────────────────────────────────
  // N * bytes_per_param. Same regardless of training/inference.
  const paramBytes = arch.params * PARAM_BYTES[paramDtype];

  // ── Gradients ──────────────────────────────────────────────────────────
  // Mixed-precision training keeps grads in the same dtype as forward params.
  // Inference: no grads.
  const gradBytes = mode === 'training' ? arch.params * PARAM_BYTES[paramDtype] : 0;

  // ── Optimizer state ────────────────────────────────────────────────────
  // Adam (mixed precision): fp32 master weights (4N) + momentum (4N) + variance (4N) = 12N.
  // Source: HuggingFace transformers docs, EleutherAI Transformer Math 101.
  // Adam-8bit (bitsandbytes): m and v in int8 (~1N each) + fp32 master (4N) ≈ 6N.
  // SGD with momentum: fp32 master (4N) + momentum (4N) = 8N.
  const optimBytesPerParam =
    mode === 'inference' ? 0 : optimizer === 'adam' ? 12 : optimizer === 'adam-8bit' ? 6 : 8;
  const optimBytes = arch.params * optimBytesPerParam;

  // ── Activations (Korthikanti et al. 2022, arXiv:2205.05198) ────────────
  // Per layer, vanilla transformer, bf16:
  //   sbh * (34 + 5 * a * s / h)
  // Selective activation recomputation drops the 5as/h attention term:
  //   ~ 34 * sbh per layer
  // Full recomputation: only need ~ 2 * sbh per layer (layer input + output).
  // Inference: activations dominated by KV cache (handled separately); a small
  // forward-pass working set remains (we model it as ~2 * sbh).
  const s = seqLen;
  const b = batch;
  const h = arch.hidden;
  const a = arch.heads;
  const L = arch.layers;

  let activationBytes = 0;
  if (mode === 'training') {
    const perLayer =
      recompute === 'none'
        ? s * b * h * (34 + (5 * a * s) / h)
        : recompute === 'selective'
          ? 34 * s * b * h
          : 2 * s * b * h;
    activationBytes = L * perLayer;
  } else {
    activationBytes = 2 * s * b * h * L;
  }

  // ── KV cache (inference only, with GQA support) ────────────────────────
  // 2 (K + V) * layers * kv_heads * head_dim * seq * batch * bytes_per_element.
  // Source: verified against Llama-3 published numbers.
  const kvBytes =
    mode === 'inference'
      ? 2 * L * arch.kvHeads * arch.headDim * s * b * PARAM_BYTES[paramDtype]
      : 0;

  // ── ZeRO / FSDP sharding (training) ────────────────────────────────────
  // ZeRO-1: optimizer states sharded
  // ZeRO-2: optimizer + gradients sharded
  // ZeRO-3 / FSDP full-shard: optimizer + gradients + params sharded
  // Source: DeepSpeed ZeRO paper (arXiv:1910.02054).
  const shardOptim = mode === 'training' && zero !== 'none';
  const shardGrads = mode === 'training' && (zero === 'zero2' || zero === 'zero3');
  const shardParams = mode === 'training' && zero === 'zero3';
  const ws = Math.max(1, worldSize);

  const paramShard = shardParams ? paramBytes / ws : paramBytes;
  const gradShard = shardGrads ? gradBytes / ws : gradBytes;
  const optimShard = shardOptim ? optimBytes / ws : optimBytes;

  // ── Framework overhead ─────────────────────────────────────────────────
  // PyTorch CUDA caching allocator, NCCL buffers, kernel workspaces.
  // 10% is a conservative middle estimate — real-world ranges 5–20%.
  const subtotal = paramShard + gradShard + optimShard + activationBytes + kvBytes;
  const overhead = subtotal * 0.1;
  const total = subtotal + overhead;

  // ── GPU fit check ──────────────────────────────────────────────────────
  const GPUS = [
    { name: 'A100 40GB', mem: 40 },
    { name: 'A100 80GB', mem: 80 },
    { name: 'H100 80GB', mem: 80 },
    { name: 'H200 141GB', mem: 141 },
    { name: 'B200 192GB', mem: 192 },
    { name: 'MI300X 192GB', mem: 192 },
  ];
  const totalGB = bytesToGB(total);

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
              Training Memory Calculator
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
              · LIVE
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>
            VRAM breakdown for training or inference, with optimizer state, activation memory, KV
            cache, and ZeRO/FSDP sharding. Formulas cited inline below.
          </p>
        </>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['training', 'inference'] as Mode[]).map((m) => (
          <button
            key={m}
            className={`filter-chip ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <Field label="Model">
          <select
            value={modelKey}
            onChange={(e) => setModelKey(e.target.value as ModelKey)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--paper)',
              border: '1px solid var(--line-2)',
              borderRadius: 6,
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--ink)',
            }}
          >
            {(Object.keys(MODELS) as ModelKey[]).map((k) => (
              <option key={k} value={k}>
                {MODELS[k].label}
              </option>
            ))}
          </select>
        </Field>

        {modelKey === 'custom' && (
          <Field label="Params (B)" value={`${customParamsB}B`}>
            <input
              type="range"
              min={0.5}
              max={500}
              step={0.5}
              value={customParamsB}
              onChange={(e) => setCustomParamsB(+e.target.value)}
              style={{ width: '100%' }}
            />
          </Field>
        )}

        <Field label="Precision">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(Object.keys(PARAM_BYTES) as ParamDtype[]).map((p) => (
              <button
                key={p}
                className={`filter-chip ${paramDtype === p ? 'active' : ''}`}
                onClick={() => setParamDtype(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Batch size" value={`${batch}`}>
          <input
            type="range"
            min={1}
            max={64}
            value={batch}
            onChange={(e) => setBatch(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>

        <Field label="Sequence length" value={`${seqLen} tokens`}>
          <input
            type="range"
            min={512}
            max={32768}
            step={512}
            value={seqLen}
            onChange={(e) => setSeqLen(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>

        {mode === 'training' && (
          <>
            <Field label="Optimizer">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(['adam', 'adam-8bit', 'sgd'] as Optimizer[]).map((o) => (
                  <button
                    key={o}
                    className={`filter-chip ${optimizer === o ? 'active' : ''}`}
                    onClick={() => setOptimizer(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Activation recompute">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(['none', 'selective', 'full'] as Recompute[]).map((r) => (
                  <button
                    key={r}
                    className={`filter-chip ${recompute === r ? 'active' : ''}`}
                    onClick={() => setRecompute(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="ZeRO / FSDP stage">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(['none', 'zero1', 'zero2', 'zero3'] as ZeroStage[]).map((z) => (
                  <button
                    key={z}
                    className={`filter-chip ${zero === z ? 'active' : ''}`}
                    onClick={() => setZero(z)}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </Field>

            {zero !== 'none' && (
              <Field label="World size (GPUs)" value={`${worldSize}`}>
                <input
                  type="range"
                  min={2}
                  max={512}
                  step={1}
                  value={worldSize}
                  onChange={(e) => setWorldSize(+e.target.value)}
                  style={{ width: '100%' }}
                />
              </Field>
            )}
          </>
        )}
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
          Per-GPU memory
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Stat label="Total per GPU" value={`${fmt(totalGB)} GB`} accent />
          <Stat label="Active arch" value={`${fmt(arch.params / 1e9, 1)}B · ${arch.layers}L`} />
          <Stat label="Shard factor" value={zero === 'none' ? '1×' : `${ws}×`} />
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <StatRow
            label={`Parameters (${paramDtype}${shardParams ? `, sharded /${ws}` : ''})`}
            value={`${fmt(bytesToGB(paramShard))} GB`}
          />
          {mode === 'training' && (
            <>
              <StatRow
                label={`Gradients${shardGrads ? ` (sharded /${ws})` : ''}`}
                value={`${fmt(bytesToGB(gradShard))} GB`}
              />
              <StatRow
                label={`Optimizer state (${optimizer}, ${optimBytesPerParam}N${shardOptim ? `, sharded /${ws}` : ''})`}
                value={`${fmt(bytesToGB(optimShard))} GB`}
              />
              <StatRow
                label={`Activations (${recompute} recompute)`}
                value={`${fmt(bytesToGB(activationBytes))} GB`}
              />
            </>
          )}
          {mode === 'inference' && (
            <>
              <StatRow
                label={`KV cache (GQA, ${arch.kvHeads} kv-heads × ${arch.headDim} dim)`}
                value={`${fmt(bytesToGB(kvBytes))} GB`}
              />
              <StatRow
                label="Forward activations (working set)"
                value={`${fmt(bytesToGB(activationBytes))} GB`}
              />
            </>
          )}
          <StatRow label="Framework overhead (~10%)" value={`${fmt(bytesToGB(overhead))} GB`} />
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Fits on
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 8,
            }}
          >
            {GPUS.map((g) => {
              const ok = totalGB < g.mem * 0.92;
              return (
                <div
                  key={g.name}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${ok ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 6,
                    background: ok ? 'var(--accent-soft)' : 'transparent',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: ok ? 'var(--accent)' : 'var(--ink-3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <span>{g.name}</span>
                  <span>{ok ? '✓' : '✗'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <details
          style={{
            marginTop: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            lineHeight: 1.6,
          }}
        >
          <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>
            Formulas &amp; references
          </summary>
          <div style={{ marginTop: 12, paddingLeft: 8 }}>
            <p>
              <strong>Parameters:</strong> N × bytes/param. bf16/fp16 = 2 B, fp8 = 1 B, fp4 = 0.5 B.
            </p>
            <p>
              <strong>Gradients (training):</strong> N × bytes/param, same dtype as forward params
              in mixed precision.
            </p>
            <p>
              <strong>Optimizer state per param:</strong> Adam mixed-precision = 12 B (fp32 master 4
              B + m 4 B + v 4 B). Adam-8bit ≈ 6 B. SGD-momentum ≈ 8 B. Source:{' '}
              <a
                href="https://blog.eleuther.ai/transformer-math/"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                EleutherAI Transformer Math 101
              </a>
              .
            </p>
            <p>
              <strong>Activations per layer (training, no recompute):</strong> s·b·h·(34 + 5·a·s/h)
              bytes at bf16. Selective recompute drops the 5as/h attention term. Full recompute
              keeps only ~2·s·b·h per layer. Source:{' '}
              <a
                href="https://arxiv.org/abs/2205.05198"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                Korthikanti et al. 2022
              </a>
              .
            </p>
            <p>
              <strong>KV cache (inference, GQA):</strong> 2 × layers × kv_heads × head_dim × seq ×
              batch × bytes/elem. The factor 2 covers both K and V; kv_heads reflects grouped-query
              attention sharing.
            </p>
            <p>
              <strong>ZeRO / FSDP sharding:</strong> stage 1 shards optimizer state, stage 2 also
              shards gradients, stage 3 also shards parameters. Each by world size. Source:{' '}
              <a
                href="https://arxiv.org/abs/1910.02054"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)' }}
              >
                Rajbhandari et al. 2019 (ZeRO)
              </a>
              .
            </p>
            <p>
              <strong>Framework overhead:</strong> a flat 10% accounts for the PyTorch caching
              allocator, NCCL buffers, and kernel workspaces. Real-world overhead typically ranges
              5–20% depending on framework, fragmentation, and microbatching.
            </p>
            <p style={{ color: 'var(--ink-4)' }}>
              ⚠ This is a back-of-envelope estimate. Real consumption varies with attention
              implementation (FlashAttention saves activation memory significantly), pipeline
              parallelism, gradient accumulation, and MoE routing. Verify with your training stack
              before committing hardware.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
