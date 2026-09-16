'use client';

import { useState } from 'react';
import { Field, Stat, StatRow } from '@/components/playground/primitives';
import {
  CHINCHILLA_TOKENS_PER_PARAM,
  GPU_PEAK,
  chinchillaTokensT,
  formatCompact,
  formatSci,
  gpuHours,
  impliedMfu,
  tokensPerParam,
  trainingFlops,
  wallClockDays,
  type GpuKey,
} from './compute';

type Preset = {
  label: string;
  params: number;
  tokens: number;
  gpu: GpuKey;
  gpuExp?: number;
  // GPU-hours the paper or model card reports, when one exists.
  reportedGpuHours?: number;
  reportedBy?: string;
  mixedPrecision?: boolean;
};

const PRESETS: Preset[] = [
  { label: 'Chinchilla 70B', params: 70, tokens: 1.4, gpu: 'a100' },
  {
    label: 'Llama 2 70B',
    params: 70,
    tokens: 2.0,
    gpu: 'a100',
    reportedGpuHours: 1_720_320,
    reportedBy: 'Llama 2 model card',
  },
  { label: 'Llama 3 8B', params: 8, tokens: 15, gpu: 'h100' },
  {
    label: 'DeepSeek-V3 (37B active)',
    params: 37,
    tokens: 14.8,
    gpu: 'h100',
    gpuExp: 11,
    reportedGpuHours: 2_664_000,
    reportedBy: 'DeepSeek-V3 report, FP8 pretraining on H800s',
    mixedPrecision: true,
  },
  {
    label: 'Llama 3 405B',
    params: 405,
    tokens: 15.6,
    gpu: 'h100',
    gpuExp: 14,
    reportedGpuHours: 30_840_000,
    reportedBy: 'Llama 3.1 model card, H100 training total',
  },
];

export default function TrainingComputeCalc({ compact = false }: { compact?: boolean }) {
  const [params, setParams] = useState(70);
  const [tokens, setTokens] = useState(1.4);
  const [gpu, setGpu] = useState<GpuKey>('h100');
  const [gpuExp, setGpuExp] = useState(10);
  const [mfu, setMfu] = useState(40);
  const [rate, setRate] = useState(2);
  // The preset stays selected until another preset is chosen; sliders never clear it.
  const [presetLabel, setPresetLabel] = useState<string | null>(null);

  const gpuCount = 2 ** gpuExp;
  const activePreset = PRESETS.find((p) => p.label === presetLabel);
  // The paper's GPU-hours only compare cleanly while the model still matches the paper.
  const presetIntact =
    activePreset !== undefined && activePreset.params === params && activePreset.tokens === tokens;
  const spec = GPU_PEAK[gpu];
  const flops = trainingFlops(params, tokens);
  const hours = gpuHours(flops, spec.tflops, mfu / 100);
  const days = wallClockDays(hours, gpuCount);
  const ratio = tokensPerParam(params, tokens);
  const sci = formatSci(flops);
  const cost = hours * rate;
  const effectiveTflops = spec.tflops * (mfu / 100);
  const clusterPflops = (effectiveTflops * gpuCount) / 1000;

  const ratioNote =
    ratio < CHINCHILLA_TOKENS_PER_PARAM * 0.75
      ? 'below the dense-model 20× reference'
      : ratio > CHINCHILLA_TOKENS_PER_PARAM * 1.5
        ? 'above the dense-model 20× reference'
        : 'near the dense-model 20× reference';

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
              Training Compute Calculator
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
              · LIVE
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 32px' }}>
            How many FLOPs, GPU-hours, and days a pretraining run needs, from the 6ND rule and the
            hardware you point at it.
          </p>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 24 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`filter-chip ${presetLabel === p.label ? 'active' : ''}`}
            onClick={() => {
              setPresetLabel(p.label);
              setParams(p.params);
              setTokens(p.tokens);
              setGpu(p.gpu);
              if (p.gpuExp !== undefined) setGpuExp(p.gpuExp);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <Field label="Parameters (active for MoE)" value={`${params}B`}>
          <input
            type="range"
            min={1}
            max={1000}
            aria-label="Parameters in billions"
            value={params}
            onChange={(e) => setParams(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Training tokens" value={`${Number(tokens.toFixed(2))}T`}>
          <input
            type="range"
            min={0.01}
            max={30}
            step={0.01}
            aria-label="Training tokens in trillions"
            value={tokens}
            onChange={(e) => setTokens(+e.target.value)}
            style={{ width: '100%' }}
          />
          <button
            className="filter-chip"
            style={{ marginTop: 8 }}
            onClick={() => setTokens(chinchillaTokensT(params))}
          >
            Chinchilla reference ({CHINCHILLA_TOKENS_PER_PARAM}× params)
          </button>
        </Field>
        <Field label="GPUs" value={gpuCount.toLocaleString()}>
          <input
            type="range"
            min={3}
            max={16}
            aria-label="GPU count exponent"
            value={gpuExp}
            onChange={(e) => setGpuExp(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="MFU (BF16 reference)" value={`${mfu}%`}>
          <input
            type="range"
            min={20}
            max={60}
            aria-label="Model FLOPs utilization percent"
            value={mfu}
            onChange={(e) => setMfu(+e.target.value)}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="GPU">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(Object.keys(GPU_PEAK) as GpuKey[]).map((k) => (
              <button
                key={k}
                className={`filter-chip ${gpu === k ? 'active' : ''}`}
                onClick={() => setGpu(k)}
              >
                {GPU_PEAK[k].name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Your GPU-hour rate" value={`$${rate.toFixed(2)}`}>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.25}
            aria-label="GPU hourly rate"
            value={rate}
            onChange={(e) => setRate(+e.target.value)}
            style={{ width: '100%' }}
          />
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
          <Stat label="Training FLOPs" value={`${sci.mantissa}e${sci.exponent}`} accent />
          <Stat label="GPU-hours" value={formatCompact(hours)} />
          <Stat
            label="Wall clock"
            value={days >= 1 ? `${days.toFixed(1)} days` : `${(days * 24).toFixed(1)} hours`}
          />
        </div>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <StatRow label="Tokens per parameter" value={`${ratio.toFixed(1)} · ${ratioNote}`} />
          <StatRow label={`Peak BF16 (${spec.name}, dense)`} value={`${spec.tflops} TFLOPS`} />
          <StatRow
            label={`Effective @ ${mfu}% MFU`}
            value={`${effectiveTflops.toFixed(0)} TFLOPS`}
          />
          <StatRow
            label={`Cluster (${gpuCount.toLocaleString()} GPUs)`}
            value={`${clusterPflops.toFixed(1)} PFLOPS`}
          />
          <StatRow
            label={`Cost @ $${rate.toFixed(2)}/GPU-hour`}
            value={`$${formatCompact(cost)}`}
          />
          {presetIntact && activePreset?.reportedGpuHours && (
            <StatRow
              label={`Reported: ${activePreset.reportedBy}`}
              value={`${formatCompact(activePreset.reportedGpuHours)} GPU-hours${
                activePreset.mixedPrecision
                  ? ''
                  : ` → ${(
                      impliedMfu(
                        flops,
                        GPU_PEAK[activePreset.gpu].tflops,
                        activePreset.reportedGpuHours,
                      ) * 100
                    ).toFixed(0)}% implied BF16 MFU on ${GPU_PEAK[activePreset.gpu].name}`
              }`}
            />
          )}
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
          Approximate model compute using 6ND and dense BF16 peak throughput. MFU must reflect your
          workload and cluster size; the estimate does not check memory fit or predict scaling
          efficiency. Attention compute is omitted. Published GPU-hours are reference totals, not
          predictions at the selected MFU.
          {presetIntact && activePreset?.mixedPrecision && (
            <>
              {' '}
              DeepSeek used FP8 mixed precision on H800s. The selected H100 is a compute proxy; this
              BF16 estimate is not a reproduction of that run.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
