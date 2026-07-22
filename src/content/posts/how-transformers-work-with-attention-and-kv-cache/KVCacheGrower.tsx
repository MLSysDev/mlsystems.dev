import { useState, useMemo, type CSSProperties, type ReactNode } from 'react';

// Real KV-cache math, computed live in the browser.
// KV bytes = 2 (K,V) × layers × kv_heads × head_dim × precision_bytes × tokens × requests
// Weights bytes = params × precision_bytes

type Model = {
  name: string;
  layers: number;
  kvHeads: number;
  headDim: number;
  params: number; // total parameters
};

const MODELS: Model[] = [
  { name: 'Llama 3 8B', layers: 32, kvHeads: 8, headDim: 128, params: 8.0e9 },
  { name: 'Llama 3 70B', layers: 80, kvHeads: 8, headDim: 128, params: 70.6e9 },
  { name: 'Llama 3 405B', layers: 126, kvHeads: 8, headDim: 128, params: 405e9 },
];

const NODES = [80, 160, 320, 640]; // GB of GPU memory (multiples of an 80GB card)
const GiB = 1024 ** 3;

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        flex: '1 1 130px',
        padding: '10px 12px',
        borderRadius: 6,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
      }}
    >
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ ...mono, fontSize: 18, color: accent ? 'var(--accent)' : 'var(--ink)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

export default function KVCacheGrower(): ReactNode {
  const [modelIdx, setModelIdx] = useState(1); // 70B
  const [fp8, setFp8] = useState(false);
  const [ctx, setCtx] = useState(32768);
  const [users, setUsers] = useState(1);
  const [nodeGB, setNodeGB] = useState(320);

  const m = MODELS[modelIdx];
  const precBytes = fp8 ? 1 : 2;

  const calc = useMemo(() => {
    const perTokenBytes = 2 * m.layers * m.kvHeads * m.headDim * precBytes;
    const perRequestBytes = perTokenBytes * ctx;
    const kvBytes = perRequestBytes * users;
    const weightsBytes = m.params * precBytes;
    const nodeBytes = nodeGB * GiB;
    const headroom = nodeBytes - weightsBytes;
    const maxUsers = perRequestBytes > 0 ? Math.max(0, Math.floor(headroom / perRequestBytes)) : 0;
    const overflow = weightsBytes + kvBytes > nodeBytes;
    return {
      perTokenKB: perTokenBytes / 1024,
      perRequestGB: perRequestBytes / GiB,
      kvGB: kvBytes / GiB,
      weightsGB: weightsBytes / GiB,
      weightsPct: Math.min(100, (weightsBytes / nodeBytes) * 100),
      kvPct: (kvBytes / nodeBytes) * 100,
      maxUsers,
      overflow,
    };
  }, [m, precBytes, ctx, users, nodeGB]);

  const btn = (active: boolean): CSSProperties => ({
    ...mono,
    padding: '4px 10px',
    borderRadius: 5,
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--line-2)'}`,
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--ink-2)',
  });

  return (
    <div
      style={{
        margin: '4px 0',
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
        Watch the KV cache eat memory
      </div>

      {/* Model + precision */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...mono, color: 'var(--ink-3)' }}>model</span>
        {MODELS.map((mm, i) => (
          <button key={mm.name} type="button" style={btn(i === modelIdx)} onClick={() => setModelIdx(i)}>
            {mm.name}
          </button>
        ))}
        <span style={{ ...mono, color: 'var(--ink-3)', marginLeft: 12 }}>precision</span>
        <button type="button" style={btn(!fp8)} onClick={() => setFp8(false)}>
          FP16
        </button>
        <button type="button" style={btn(fp8)} onClick={() => setFp8(true)}>
          FP8
        </button>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...mono, width: 150, flexShrink: 0 }}>
            context length <strong style={{ color: 'var(--ink)' }}>{ctx.toLocaleString()}</strong> tok
          </span>
          <input
            type="range"
            min={512}
            max={131072}
            step={512}
            value={ctx}
            onChange={(e) => setCtx(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
            aria-label="context length in tokens"
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...mono, width: 150, flexShrink: 0 }}>
            concurrent users <strong style={{ color: 'var(--ink)' }}>{users}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={64}
            step={1}
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
            aria-label="number of concurrent users"
          />
        </label>
      </div>

      {/* GPU node size */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...mono, color: 'var(--ink-3)' }}>GPU node</span>
        {NODES.map((n) => (
          <button key={n} type="button" style={btn(n === nodeGB)} onClick={() => setNodeGB(n)}>
            {n} GB
          </button>
        ))}
      </div>

      {/* Memory bar */}
      <div style={{ ...mono, fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
        GPU memory ({nodeGB} GB) — weights (fixed) + KV cache ({users} user{users > 1 ? 's' : ''})
      </div>
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 34,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: 'var(--paper)',
        }}
      >
        <div
          style={{
            width: `${calc.weightsPct}%`,
            background: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
          title="model weights"
        >
          {calc.weightsPct > 14 ? 'weights' : ''}
        </div>
        <div
          style={{
            width: `${Math.max(0, Math.min(100 - calc.weightsPct, calc.kvPct))}%`,
            background: calc.overflow ? 'var(--tc-red, #e03e3e)' : 'var(--accent)',
            transition: 'width 0.12s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
          title="KV cache"
        >
          {calc.kvPct > 12 ? 'KV cache' : ''}
        </div>
      </div>
      {calc.overflow && (
        <div style={{ ...mono, color: 'var(--tc-red, #e03e3e)', marginTop: 6 }}>
          ⚠ Over capacity — weights + KV exceed {nodeGB} GB. Reduce users/context, use FP8, or add GPUs.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        <Stat label="per token" value={`${calc.perTokenKB.toFixed(0)} KB`} />
        <Stat label="one request" value={`${calc.perRequestGB.toFixed(1)} GB`} accent />
        <Stat label="weights" value={`${calc.weightsGB.toFixed(0)} GB`} />
        <Stat label={`max users @ ${(ctx / 1024).toFixed(0)}K ctx`} value={`${calc.maxUsers}`} accent />
      </div>

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
          fontSize: 11.5,
        }}
      >
        per token = 2 × {m.layers} layers × {m.kvHeads} kv-heads × {m.headDim} × {precBytes} B ={' '}
        <strong style={{ color: 'var(--accent)' }}>{calc.perTokenKB.toFixed(0)} KB</strong> · × {ctx.toLocaleString()} tok ={' '}
        <strong style={{ color: 'var(--accent)' }}>{calc.perRequestGB.toFixed(1)} GB</strong> per request
      </div>

    </div>
  );
}
