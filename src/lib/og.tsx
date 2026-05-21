import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { SITE } from '@/lib/site';

const PROJECT_ROOT = process.cwd();
const fontCache = new Map<string, Buffer>();
let logoDataUrlCache: string | null = null;

function loadFont(relPath: string): Buffer {
  if (fontCache.has(relPath)) return fontCache.get(relPath)!;
  const fullPath = join(PROJECT_ROOT, 'node_modules', relPath);
  try {
    const buf = readFileSync(fullPath);
    fontCache.set(relPath, buf);
    return buf;
  } catch (err) {
    throw new Error(`[og] font not found at ${fullPath}. Did you run \`npm install\`?`, {
      cause: err,
    });
  }
}

function loadLogoDataUrl(): string {
  if (logoDataUrlCache) return logoDataUrlCache;
  const fullPath = join(PROJECT_ROOT, 'public', 'web-app-manifest-512x512.png');
  try {
    const buf = readFileSync(fullPath);
    logoDataUrlCache = `data:image/png;base64,${buf.toString('base64')}`;
    return logoDataUrlCache;
  } catch (err) {
    throw new Error(`[og] logo not found at ${fullPath}. Place a 512x512 PNG there.`, {
      cause: err,
    });
  }
}

export interface OgArticle {
  title: string;
  authorNames: string;
  topic?: string;
}

const C = {
  paper: '#f5f1e8',
  paper2: '#ede7d6',
  ink: '#18171a',
  ink2: '#4a4844',
  ink3: '#807c73',
  ink4: '#b4ad9e',
  line: '#d9d3c2',
  accent: '#b8431f',
};

const SHELL_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: C.paper,
  padding: '64px 72px',
  position: 'relative',
  fontFamily: 'Geist',
};

const BORDER_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 32,
  left: 32,
  right: 32,
  bottom: 32,
  border: `1px solid ${C.line}`,
  borderRadius: 4,
  display: 'flex',
};

const ACCENT_RULE_STYLE: React.CSSProperties = {
  width: 64,
  height: 2,
  background: C.accent,
  marginBottom: 22,
  display: 'flex',
};

const URL_STAMP_STYLE: React.CSSProperties = {
  fontFamily: 'JetBrains Mono',
  fontSize: 22,
  color: C.ink2,
  letterSpacing: 0.4,
  display: 'flex',
};

function brandBar(): React.ReactElement {
  const logo = loadLogoDataUrl();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <img src={logo} width={68} height={68} style={{ borderRadius: 10 }} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
            letterSpacing: 3,
            color: C.ink,
            fontWeight: 600,
          }}
        >
          MLSYSTEMS.DEV
        </span>
        <span
          style={{
            fontFamily: 'Instrument Serif',
            fontStyle: 'italic',
            fontSize: 28,
            color: C.ink2,
            letterSpacing: -0.5,
            display: 'flex',
          }}
        >
          Machine learning, from{' '}
          <span style={{ color: C.accent, display: 'flex', marginLeft: 8, marginRight: 8 }}>
            kernels
          </span>{' '}
          to clusters.
        </span>
      </div>
    </div>
  );
}

function template(d: OgArticle): React.ReactElement {
  const title = d.title.length > 110 ? d.title.slice(0, 107) + '…' : d.title;
  const meta = [d.authorNames, d.topic].filter(Boolean).join('  ·  ');

  return (
    <div style={SHELL_STYLE}>
      <div style={BORDER_STYLE} />
      {brandBar()}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: 24 }}>
        <div
          style={{
            fontFamily: 'Instrument Serif',
            fontSize: 76,
            lineHeight: 1.04,
            color: C.ink,
            letterSpacing: -1.2,
            display: 'flex',
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
      </div>
      <div style={ACCENT_RULE_STYLE} />
      <div style={URL_STAMP_STYLE}>{meta}</div>
    </div>
  );
}

function pageTemplate(title: string): React.ReactElement {
  const t = title.length > 80 ? title.slice(0, 77) + '…' : title;
  return (
    <div style={SHELL_STYLE}>
      <div style={BORDER_STYLE} />
      {brandBar()}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: 28 }}>
        <div
          style={{
            fontFamily: 'Instrument Serif',
            fontSize: 132,
            lineHeight: 1.0,
            color: C.ink,
            letterSpacing: -2,
            display: 'flex',
            maxWidth: 1040,
          }}
        >
          {t}.
        </div>
      </div>
      <div style={ACCENT_RULE_STYLE} />
      <div style={URL_STAMP_STYLE}>{SITE.domain}</div>
    </div>
  );
}

function authorTemplate(name: string, bio?: string, handle?: string): React.ReactElement {
  return (
    <div style={SHELL_STYLE}>
      <div style={BORDER_STYLE} />
      {brandBar()}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginTop: 28,
        }}
      >
        <div
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 18,
            letterSpacing: 3,
            color: C.ink3,
            textTransform: 'uppercase',
            marginBottom: 16,
            display: 'flex',
          }}
        >
          Contributor
        </div>
        <div
          style={{
            fontFamily: 'Instrument Serif',
            fontSize: 108,
            lineHeight: 1.0,
            color: C.ink,
            letterSpacing: -1.5,
            display: 'flex',
            maxWidth: 1040,
          }}
        >
          {name}
        </div>
        {bio && (
          <div
            style={{
              fontFamily: 'Instrument Serif',
              fontStyle: 'italic',
              fontSize: 32,
              lineHeight: 1.3,
              color: C.ink2,
              letterSpacing: -0.5,
              marginTop: 18,
              display: 'flex',
              maxWidth: 1000,
            }}
          >
            {bio.length > 120 ? bio.slice(0, 117) + '…' : bio}
          </div>
        )}
      </div>
      <div style={ACCENT_RULE_STYLE} />
      <div style={URL_STAMP_STYLE}>{handle ? `${SITE.domain}/authors/${handle}` : SITE.domain}</div>
    </div>
  );
}

function defaultTemplate(): React.ReactElement {
  return (
    <div style={SHELL_STYLE}>
      <div style={BORDER_STYLE} />
      {brandBar()}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: 28 }}>
        <div
          style={{
            fontFamily: 'Instrument Serif',
            fontSize: 124,
            lineHeight: 1.0,
            color: C.ink,
            letterSpacing: -2,
            display: 'flex',
            maxWidth: 1040,
          }}
        >
          An open archive.
        </div>
      </div>
      <div style={ACCENT_RULE_STYLE} />
      <div style={URL_STAMP_STYLE}>{SITE.domain}</div>
    </div>
  );
}

async function renderToPng(node: React.ReactElement, context: string): Promise<Buffer> {
  try {
    const serif = loadFont(
      '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff',
    );
    const mono = loadFont('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff');

    const svg = await satori(node, {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Instrument Serif', data: serif, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
        { name: 'Geist', data: mono, weight: 400, style: 'normal' },
      ],
    });

    const resvg = new Resvg(svg, {
      background: C.paper,
      fitTo: { mode: 'width', value: 1200 },
    });
    return resvg.render().asPng();
  } catch (err) {
    throw new Error(`[og] render failed for "${context}"`, { cause: err });
  }
}

export async function generateOgPng(article: OgArticle): Promise<Buffer> {
  return renderToPng(template(article), `article:${article.title}`);
}

export async function generateDefaultOgPng(): Promise<Buffer> {
  return renderToPng(defaultTemplate(), 'default');
}

export async function generatePageOgPng(title: string): Promise<Buffer> {
  return renderToPng(pageTemplate(title), `page:${title}`);
}

export async function generateAuthorOgPng(
  name: string,
  bio?: string,
  handle?: string,
): Promise<Buffer> {
  return renderToPng(authorTemplate(name, bio, handle), `author:${handle ?? name}`);
}
