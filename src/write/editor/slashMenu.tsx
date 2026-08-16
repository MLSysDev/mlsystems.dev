import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import type { WriteEditor } from './schema';

const HIDDEN = [
  'image',
  'video',
  'audio',
  'file',
  'emoji',
  'table',
  'divider',
  'page',
  // Toggle headings stay dropdown-only to keep the slash menu uncluttered;
  // Check List and Toggle List are offered here (both are exported).
  'toggle heading',
];

/**
 * A toggle serialises to <details>, whose body the converter reads back as
 * plain markdown — so a block that publishes as a JSX tag has no reader on the
 * way in and returns as a paragraph. Nesting is for code, prose, lists and
 * tables; media and components belong at the top level.
 */
const NOT_NESTABLE = [
  'image',
  'gallery',
  'video',
  'svg / diagram',
  'mermaid diagram',
  'note',
  'custom component',
];

export function nestable(item: { title: string }): boolean {
  return !NOT_NESTABLE.includes(item.title.toLowerCase());
}

export function isCursorNested(editor: WriteEditor): boolean {
  const id = editor.getTextCursorPosition?.()?.block?.id;
  if (!id) return false;
  type Node = { id: string; children?: Node[] };
  const search = (blocks: Node[], depth: number): boolean =>
    blocks.some((b) => (depth > 0 && b.id === id) || search(b.children ?? [], depth + 1));
  return search(editor.document as unknown as Node[], 0);
}

const GROUP_ORDER = ['Headings', 'Subheadings', 'Basic blocks', 'Media', 'Advanced'];

function groupRank(group: string | undefined): number {
  const i = GROUP_ORDER.indexOf(group ?? '');
  return i === -1 ? GROUP_ORDER.length : i;
}

const EMPTY_3X3 = {
  type: 'tableContent' as const,
  rows: [{ cells: ['', '', ''] }, { cells: ['', '', ''] }, { cells: ['', '', ''] }],
};

const svg = (children: React.ReactNode) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const ICONS = {
  image: svg(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </>,
  ),
  gallery: svg(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>,
  ),
  video: svg(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" />
    </>,
  ),
  table: svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="9" x2="9" y2="20" />
      <line x1="15" y1="9" x2="15" y2="20" />
    </>,
  ),
  note: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  rule: svg(<line x1="4" y1="12" x2="20" y2="12" />),
  divider: svg(
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>,
  ),
  math: (
    <span style={{ fontSize: 17, fontFamily: 'var(--font-read, serif)', lineHeight: 1 }}>∑</span>
  ),
  component: svg(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>,
  ),
  svg: svg(
    <>
      <path d="M12 3v18M3 12h18" opacity="0.4" />
      <circle cx="7" cy="8" r="2" />
      <circle cx="17" cy="16" r="2" />
      <path d="M9 8h6M7 10v4" />
    </>,
  ),
  mermaid: svg(
    <>
      <rect x="3" y="4" width="7" height="5" rx="1" />
      <rect x="14" y="15" width="7" height="5" rx="1" />
      <path d="M10 6.5h4v11h-4" fill="none" />
    </>,
  ),
};

export function getSlashItems(editor: WriteEditor) {
  const defaults = getDefaultReactSlashMenuItems(editor).filter(
    (item) => !HIDDEN.some((h) => item.title.toLowerCase().includes(h)),
  );

  const custom = [
    {
      title: 'Image',
      subtext: 'Upload an image or paste a URL',
      aliases: ['image', 'figure', 'photo', 'picture'],
      group: 'Media',
      icon: ICONS.image,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'figure' }),
    },
    {
      title: 'Gallery',
      subtext: 'Several images side by side',
      aliases: ['gallery', 'images', 'grid'],
      group: 'Media',
      icon: ICONS.gallery,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'gallery' }),
    },
    {
      title: 'Video',
      subtext: 'Embed a YouTube video',
      aliases: ['video', 'youtube', 'embed'],
      group: 'Media',
      icon: ICONS.video,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'video' }),
    },
    {
      title: 'SVG / Diagram',
      subtext: 'Paste an SVG — renders inline, adapts to light & dark',
      aliases: ['svg', 'diagram', 'vector', 'illustration', 'chart', 'figure'],
      group: 'Media',
      icon: ICONS.svg,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'svg' }),
    },
    {
      title: 'Mermaid diagram',
      subtext: 'Write mermaid, publish a static SVG',
      aliases: ['mermaid', 'flowchart', 'sequence', 'graph', 'diagram'],
      group: 'Media',
      icon: ICONS.mermaid,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'mermaid' }),
    },
    {
      title: 'Table',
      subtext: 'A 3×3 table — the first row is the header',
      aliases: ['table', 'grid', 'rows', 'columns'],
      group: 'Basic blocks',
      icon: ICONS.table,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'table', content: EMPTY_3X3 }),
    },
    {
      title: 'Note',
      subtext: 'A callout the reader should not miss',
      aliases: ['note', 'callout', 'aside'],
      group: 'Basic blocks',
      icon: ICONS.note,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'note' }),
    },
    {
      title: 'Divider',
      subtext: 'A · · · section break',
      aliases: ['divider', 'separator', 'break'],
      group: 'Basic blocks',
      icon: ICONS.divider,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'separator' }),
    },
    {
      title: 'Line divider',
      subtext: 'A straight horizontal rule',
      aliases: ['line', 'hr', 'rule', 'straight'],
      group: 'Basic blocks',
      icon: ICONS.rule,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'divider' }),
    },
    {
      title: 'Math equation',
      subtext: 'A display equation written in LaTeX',
      aliases: ['math', 'latex', 'equation', 'katex'],
      group: 'Basic blocks',
      icon: ICONS.math,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'math' }),
    },
    {
      title: 'Custom component',
      subtext: 'Attach React code that renders after publish',
      aliases: ['component', 'react', 'tsx', 'advanced'],
      group: 'Advanced',
      icon: ICONS.component,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'customComponent' }),
    },
  ];

  return [...defaults, ...custom].sort((a, b) => groupRank(a.group) - groupRank(b.group));
}
