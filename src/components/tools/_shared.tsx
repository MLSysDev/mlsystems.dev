import type React from 'react';

export function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <span>{label}</span>
        {value && (
          <span style={{ color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          lineHeight: 1,
          fontWeight: 400,
          color: accent ? 'var(--accent)' : warn ? '#c2410c' : 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
