'use client';

import { useState } from 'react';
import ThroughputCalc from '@/content/tools/throughput-calc/ThroughputCalc';
import GpuMemoryCalc from '@/content/tools/gpu-mem-calc/GpuMemoryCalc';
import AttentionViz from '@/content/tools/attention-viz/AttentionViz';

export type PlaygroundTool = {
  id: string;
  name: string;
  desc: string;
  tag: string;
  available: boolean;
};

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  'throughput-calc': ThroughputCalc,
  'gpu-mem-calc': GpuMemoryCalc,
  'attention-viz': AttentionViz,
};

export default function Playground({ tools }: { tools: PlaygroundTool[] }) {
  const firstAvailable = tools.find((t) => t.available && TOOL_COMPONENTS[t.id]);
  const [active, setActive] = useState<string>(firstAvailable?.id ?? '');
  const Active = TOOL_COMPONENTS[active];

  return (
    <div className="playground-grid">
      <div className="playground-sidebar">
        {tools.map((t) => {
          const interactive = t.available && Boolean(TOOL_COMPONENTS[t.id]);
          return (
            <button
              key={t.id}
              className={`playground-tool-btn${active === t.id ? ' active' : ''}${!interactive ? ' disabled' : ''}`}
              onClick={() => interactive && setActive(t.id)}
              disabled={!interactive}
            >
              <div className="playground-tool-header">
                <span className="playground-tool-name">{t.name}</span>
                <span className="playground-tool-tag">{t.tag}</span>
              </div>
              <div className="playground-tool-desc">{t.desc}</div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 12,
          background: 'var(--paper-2)',
          padding: 32,
          minHeight: 540,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1 }}>{Active ? <Active /> : null}</div>

        {active && (
          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <a
              href={`/playground/${active}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'color 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--ink-3)';
              }}
            >
              Open full page →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
