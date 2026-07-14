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
  fontFamily: 'Playfair Display',
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
            fontFamily: 'Playfair Display',
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

function coverTemplate(d: OgArticle, coverUrl: string): React.ReactElement {
  const title = d.title.length > 100 ? d.title.slice(0, 97) + '…' : d.title;
  const meta = [d.authorNames, d.topic].filter(Boolean).join('  ·  ');
  const logo = loadLogoDataUrl();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        fontFamily: 'Playfair Display',
      }}
    >
      <img
        src={coverUrl}
        width={1200}
        height={630}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          objectFit: 'cover',
        }}
        alt=""
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: 'flex',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 34%, rgba(0,0,0,0.84) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px 68px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 58,
            left: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <img src={logo} width={56} height={56} style={{ borderRadius: 8 }} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 20,
                letterSpacing: 3,
                color: '#ffffff',
                fontWeight: 600,
              }}
            >
              MLSYSTEMS.DEV
            </span>
            <span
              style={{
                fontFamily: 'Playfair Display',
                fontStyle: 'italic',
                fontSize: 25,
                color: '#ece7db',
                letterSpacing: -0.5,
                display: 'flex',
              }}
            >
              Machine learning, from{' '}
              <span style={{ color: '#e0794f', display: 'flex', marginLeft: 7, marginRight: 7 }}>
                kernels
              </span>{' '}
              to clusters.
            </span>
          </div>
        </div>
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontSize: 72,
            lineHeight: 1.05,
            color: '#ffffff',
            letterSpacing: -1.2,
            display: 'flex',
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 64,
            height: 3,
            background: C.accent,
            margin: '22px 0 18px',
            display: 'flex',
          }}
        />
        <div
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
            color: '#ece7db',
            letterSpacing: 0.4,
            display: 'flex',
          }}
        >
          {meta}
        </div>
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
            fontFamily: 'Playfair Display',
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
            fontFamily: 'Playfair Display',
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
            fontFamily: 'Playfair Display',
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
              fontFamily: 'Playfair Display',
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

function toolTemplate(name: string, summary: string, tag: string): React.ReactElement {
  const truncatedSummary = summary.length > 180 ? summary.slice(0, 177) + '…' : summary;
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
            fontSize: 16,
            letterSpacing: 3,
            color: C.accent,
            textTransform: 'uppercase',
            marginBottom: 14,
            display: 'flex',
          }}
        >
          Playground · {tag}
        </div>
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontSize: 92,
            lineHeight: 1.0,
            color: C.ink,
            letterSpacing: -1.5,
            display: 'flex',
            maxWidth: 1040,
            marginBottom: 18,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontStyle: 'italic',
            fontSize: 28,
            lineHeight: 1.35,
            color: C.ink2,
            letterSpacing: -0.3,
            display: 'flex',
            maxWidth: 1000,
          }}
        >
          {truncatedSummary}
        </div>
      </div>
      <div style={ACCENT_RULE_STYLE} />
      <div style={URL_STAMP_STYLE}>{SITE.domain}/playground</div>
    </div>
  );
}

function defaultTemplate(): React.ReactElement {
  return (
    <div style={SHELL_STYLE}>
      <div style={BORDER_STYLE} />
      {/* faint on-brand square motif, bottom-right, behind the text */}
      <div
        style={{
          position: 'absolute',
          right: -64,
          bottom: -64,
          width: 300,
          height: 300,
          border: `2px solid ${C.line}`,
          borderRadius: 18,
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 72,
          bottom: 72,
          width: 200,
          height: 200,
          border: `2px solid ${C.line}`,
          borderRadius: 14,
          display: 'flex',
        }}
      />
      {brandBar()}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: 28 }}>
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontSize: 104,
            lineHeight: 1.0,
            color: C.ink,
            letterSpacing: -2,
            display: 'flex',
            maxWidth: 1000,
          }}
        >
          Machine learning systems.
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
      '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff',
    );
    const serifItalic = loadFont(
      '@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff',
    );
    const mono = loadFont('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff');

    const svg = await satori(node, {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Playfair Display', data: serif, weight: 400, style: 'normal' },
        { name: 'Playfair Display', data: serifItalic, weight: 400, style: 'italic' },
        { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
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

export async function generateOgPng(article: OgArticle, coverDataUrl?: string): Promise<Buffer> {
  const node = coverDataUrl ? coverTemplate(article, coverDataUrl) : template(article);
  return renderToPng(node, `article:${article.title}`);
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

export async function generateToolOgPng(
  name: string,
  summary: string,
  tag: string,
): Promise<Buffer> {
  return renderToPng(toolTemplate(name, summary, tag), `tool:${name}`);
}
