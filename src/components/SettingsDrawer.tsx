'use client';

import { useEffect, useState } from 'react';

type Settings = {
  theme: 'light' | 'dark';
  accent: 'oxide' | 'indigo' | 'emerald' | 'ink';
  typeset: 'editorial' | 'modern' | 'terminal';
  background: 'plain' | 'grid' | 'dots' | 'noise';
  density: 'compact' | 'comfortable' | 'spacious';
};

const DEFAULTS: Settings = {
  theme: 'light',
  accent: 'oxide',
  typeset: 'editorial',
  background: 'plain',
  density: 'comfortable',
};

const STORAGE_KEY = 'mlsystems-settings';

function applyToRoot(s: Settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-accent', s.accent);
  root.setAttribute('data-typeset', s.typeset);
  root.setAttribute('data-bg', s.background);
  root.setAttribute('data-density', s.density);
}

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
        setSettings(parsed);
        applyToRoot(parsed);
      }
    } catch {}
    setMounted(true);
  }, []);

  // Apply + persist when settings change
  useEffect(() => {
    if (!mounted) return;
    applyToRoot(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, mounted]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open settings"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: 22,
          background: 'var(--paper)',
          border: '1px solid var(--line-2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          zIndex: 100,
          color: 'var(--ink-2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
        }}
      >
        {open ? '×' : '⚙'}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 280,
            background: 'var(--paper)',
            border: '1px solid var(--line-2)',
            borderRadius: 12,
            padding: 20,
            zIndex: 100,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            fontFamily: 'var(--font-sans)',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 16 }}>
            Settings
          </div>

          <Group label="Theme">
            <Segmented
              value={settings.theme}
              options={['light', 'dark']}
              onChange={(v) => set('theme', v as Settings['theme'])}
            />
          </Group>

          <Group label="Accent">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['oxide', 'indigo', 'emerald', 'ink'] as const).map((a) => {
                const color = {
                  oxide: '#b8431f',
                  indigo: '#3949c2',
                  emerald: '#15795e',
                  ink: '#18171a',
                }[a];
                const isActive = settings.accent === a;
                return (
                  <button
                    key={a}
                    onClick={() => set('accent', a)}
                    aria-label={a}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: color,
                      border: `2px solid ${isActive ? 'var(--ink)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  />
                );
              })}
            </div>
          </Group>

          <Group label="Typography">
            <Select
              value={settings.typeset}
              onChange={(v) => set('typeset', v as Settings['typeset'])}
              options={[
                { value: 'editorial', label: 'Editorial' },
                { value: 'modern', label: 'Modern' },
                { value: 'terminal', label: 'Terminal' },
              ]}
            />
          </Group>

          <Group label="Density">
            <Segmented
              value={settings.density}
              options={['compact', 'comfortable', 'spacious']}
              onChange={(v) => set('density', v as Settings['density'])}
            />
          </Group>

          <Group label="Background">
            <Select
              value={settings.background}
              onChange={(v) => set('background', v as Settings['background'])}
              options={[
                { value: 'plain', label: 'Plain' },
                { value: 'grid', label: 'Grid lines' },
                { value: 'dots', label: 'Dot grid' },
                { value: 'noise', label: 'Paper noise' },
              ]}
            />
          </Group>

          <button
            onClick={() => {
              setSettings(DEFAULTS);
            }}
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--ink-3)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 0,
        background: 'var(--paper-2)',
        borderRadius: 6,
        padding: 2,
        border: '1px solid var(--line)',
      }}
    >
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            background: value === o ? 'var(--paper)' : 'transparent',
            border: value === o ? '1px solid var(--line-2)' : '1px solid transparent',
            borderRadius: 4,
            cursor: 'pointer',
            color: value === o ? 'var(--ink)' : 'var(--ink-2)',
            textTransform: 'capitalize',
            transition: 'background 0.15s',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 10px',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        background: 'var(--paper)',
        border: '1px solid var(--line-2)',
        borderRadius: 6,
        color: 'var(--ink)',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
