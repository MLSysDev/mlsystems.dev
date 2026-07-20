import { useState, type CSSProperties } from 'react';

const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' };
const label: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--ink-3)',
};

const ADAPTERS = [
  {
    id: 'json',
    name: 'JSON extractor',
    size: '3.9 MB',
    prompt: 'Ava Kim, 41, Sales, joined 2019-03-02',
    output: '{"name":"Ava Kim","age":41,"department":"Sales","start_date":"2019-03-02"}',
  },
  {
    id: 'sql',
    name: 'SQL writer',
    size: '4.1 MB',
    prompt: 'users in Sales older than 30',
    output: "SELECT * FROM users WHERE department = 'Sales' AND age > 30;",
  },
  {
    id: 'fr',
    name: 'FR translator',
    size: '3.8 MB',
    prompt: 'Good morning, how are you?',
    output: 'Bonjour, comment allez-vous ?',
  },
  {
    id: 'sum',
    name: 'Summarizer',
    size: '4.0 MB',
    prompt: 'The meeting covered budget, hiring, and the Q3 roadmap in detail.',
    output: 'Budget, hiring, and Q3 roadmap discussed.',
  },
];

export default function MultiLoRASwap() {
  const [i, setI] = useState(0);
  const a = ADAPTERS[i];

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '20px', background: 'var(--paper-2)' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', padding: '12px 14px', borderRadius: 6, border: '1px dashed var(--line-2)', background: 'var(--paper)' }}>
          <div style={label}>frozen base · shared</div>
          <div style={{ ...mono, color: 'var(--ink)', marginTop: 4 }}>Qwen3-0.6B</div>
          <div style={{ ...mono, color: 'var(--ink-3)', fontSize: 11 }}>1.2 GB · loaded once</div>
        </div>
        <div style={{ alignSelf: 'center', ...mono, color: 'var(--ink-3)' }}>+</div>
        <div style={{ flex: '1 1 200px', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent-soft)' }}>
          <div style={{ ...label, color: 'var(--accent)' }}>adapter · swapped</div>
          <div style={{ ...mono, color: 'var(--ink)', marginTop: 4 }}>{a.name}</div>
          <div style={{ ...mono, color: 'var(--ink-3)', fontSize: 11 }}>{a.size} · hot-swappable</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {ADAPTERS.map((ad, idx) => (
          <button
            key={ad.id}
            type="button"
            onClick={() => setI(idx)}
            style={{
              ...mono,
              padding: '5px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              border: `1px solid ${idx === i ? 'var(--accent)' : 'var(--line-2)'}`,
              background: idx === i ? 'var(--accent-soft)' : 'transparent',
              color: idx === i ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {ad.name}
          </button>
        ))}
      </div>

      <div style={{ ...label, marginBottom: 6 }}>input</div>
      <div style={{ ...mono, padding: '10px 14px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line)', marginBottom: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.prompt}</div>
      <div style={{ ...label, marginBottom: 6 }}>output · same frozen base, {a.name} adapter</div>
      <div style={{ ...mono, padding: '10px 14px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--accent)', color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.output}</div>
    </div>
  );
}
