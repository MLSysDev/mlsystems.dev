import fs from 'node:fs';

let SRC = process.argv[2];
if (!SRC) {
  console.error(
    'usage: node docs/authoring/mdx-to-write-source.mjs <post-dir-or-index.mdx> [out.json]',
  );
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error(`not found: ${SRC}`);
  process.exit(1);
}
if (fs.statSync(SRC).isDirectory()) SRC = SRC.replace(/\/$/, '') + '/index.mdx';
const slug = SRC.split('/').filter(Boolean).at(-2) ?? 'post-slug';
const OUT = process.argv[3] ?? `${slug}.write-source.json`;

let src = fs.readFileSync(SRC, 'utf8');

const fm = src.match(/^---\n([\s\S]*?)\n---\n/);
const body = fm ? src.slice(fm[0].length) : src;
const fmText = fm ? fm[1] : '';
const fmVal = (key) => {
  const m = fmText.match(new RegExp(`^${key}: (.*)$`, 'm'));
  return m ? m[1].replace(/^"|"$/g, '') : '';
};
const tagsMatch = fmText.match(/^tags: (\[.*\])$/m);
const tags = tagsMatch ? JSON.parse(tagsMatch[1].replace(/'/g, '"')) : [];

let n = 0;
const id = (p) => `${p}-${++n}`;
const D = { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' };

const INLINE_PATTERNS = [
  { re: /\*\*`([^`]+)`\*\*/g, kind: 'code' },
  { re: /`([^`]+)`/g, kind: 'code' },
  { re: /(?<!!)\[([^\]]+)\]\(([^)\s]+)\)/g, kind: 'link' },
  { re: /\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g, kind: 'style', key: 'bold' },
  { re: /__([^_]+)__/g, kind: 'style', key: 'bold' },
  { re: /~~([^~]+)~~/g, kind: 'style', key: 'strike' },
  { re: /\*([^*\n]+)\*/g, kind: 'style', key: 'italic' },
  { re: /(?<![\w`])_([^_\n]+)_(?![\w`])/g, kind: 'style', key: 'italic' },
];

function smartQuotes(s) {
  return s
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s([{—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{—–-])'/g, '$1‘')
    .replace(/'/g, '’');
}

function inline(text, inherited = {}) {
  const runs = [];
  let pos = 0;
  while (pos < text.length) {
    let best = null;
    for (const p of INLINE_PATTERNS) {
      p.re.lastIndex = pos;
      const m = p.re.exec(text);
      if (m && (!best || m.index < best.m.index)) best = { p, m };
    }
    if (!best) {
      runs.push({ type: 'text', text: smartQuotes(text.slice(pos)), styles: { ...inherited } });
      break;
    }
    if (best.m.index > pos)
      runs.push({
        type: 'text',
        text: smartQuotes(text.slice(pos, best.m.index)),
        styles: { ...inherited },
      });
    const { p, m } = best;
    if (p.kind === 'code') {
      runs.push({ type: 'text', text: m[1], styles: { code: true } });
    } else if (p.kind === 'link') {
      runs.push({
        type: 'link',
        href: m[2],
        content: inline(m[1], inherited).filter((r) => r.type === 'text'),
      });
    } else {
      runs.push(...inline(m[1], { ...inherited, [p.key]: true }));
    }
    pos = m.index + m[0].length;
  }
  return runs.filter((r) => r.type !== 'text' || r.text !== '');
}

const blocks = [];
const push = (type, props, content, children = []) => {
  const b = { id: id(type), type, props, children };
  if (content !== undefined) b.content = content;
  blocks.push(b);
};

const cell = (text) => ({
  type: 'tableCell',
  content: inline(text),
  props: { colspan: 1, rowspan: 1, ...D },
});

const DIR = SRC.replace(/\/index\.mdx$/, '');

function componentSource(name) {
  const file = `${DIR}/${name}.tsx`;
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  console.warn(`warning: ${name}.tsx not found next to index.mdx — source left empty`);
  return '';
}

function frameAttr(attrs, name) {
  return (
    attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ??
    JSON.parse(attrs.match(new RegExp(`${name}=\\{("(?:[^"\\\\]|\\\\.)*")\\}`))?.[1] ?? '""')
  );
}

function frameProps(attrs) {
  return {
    frameTitle: frameAttr(attrs, 'title'),
    frameCaption: frameAttr(attrs, 'caption'),
    frameSize: /size="wide"/.test(attrs) ? 'wide' : 'normal',
    frameExpand: /(^|\s)expand(\s|$|=)/.test(attrs),
  };
}

let rest = body;
const pattern =
  /(<Figure caption=(?:"([\s\S]*?)"|\{("(?:[^"\\]|\\.)*")\})>\s*([\s\S]*?)\s*<\/Figure>)|(<Note>\s*([\s\S]*?)\s*<\/Note>)|(```(\w*)\n([\s\S]*?)```)|(<Interactive\b([^>]*)>\s*<([A-Za-z]\w*)\s+client:visible\s*\/>\s*<\/Interactive>)|(<([A-Z]\w*)\s+client:visible\s*\/>)/g;

let cursor = 0;
const segments = [];
let m;
while ((m = pattern.exec(rest))) {
  if (m.index > cursor) segments.push({ kind: 'md', text: rest.slice(cursor, m.index) });
  if (m[1]) {
    const caption = m[3] ? JSON.parse(m[3]) : (m[2] ?? '');
    segments.push({
      kind: 'figure',
      caption: caption.replace(/\s+/g, ' ').trim(),
      svg: m[4].trim(),
    });
  } else if (m[5]) segments.push({ kind: 'note', text: m[6].replace(/\s+/g, ' ').trim() });
  else if (m[7])
    segments.push({ kind: 'code', lang: m[8] || 'text', code: m[9].replace(/\n$/, '') });
  else if (m[10]) segments.push({ kind: 'component', name: m[12], frame: frameProps(m[11]) });
  else if (m[13])
    segments.push({
      kind: 'component',
      name: m[14],
      frame: { frameTitle: '', frameCaption: '', frameSize: 'normal', frameExpand: false },
    });
  cursor = m.index + m[0].length;
}
if (cursor < rest.length) segments.push({ kind: 'md', text: rest.slice(cursor) });

function emitMd(text) {
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^import\s.+\sfrom\s/.test(line)) {
      i++;
      continue;
    }
    const h = line.match(/^(#{2,6}) /);
    if (h) {
      push(
        'heading',
        { ...D, level: Math.min(h[1].length - 1, 3), isToggleable: false },
        inline(line.slice(h[1].length + 1)),
      );
      i++;
      continue;
    }
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      push('figure', { fileName: '', src: img[2], alt: img[1], caption: '', width: 360 });
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const q = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        q.push(lines[i].slice(2));
        i++;
      }
      push('quote', { backgroundColor: 'default', textColor: 'default' }, inline(q.join(' ')));
      continue;
    }
    if (/^[-*] \[[ xX]\] /.test(line)) {
      while (i < lines.length && /^[-*] \[[ xX]\] /.test(lines[i])) {
        push(
          'checkListItem',
          { ...D, checked: /^\S+ \[[xX]\]/.test(lines[i]) },
          inline(lines[i].replace(/^[-*] \[[ xX]\] /, '')),
        );
        i++;
      }
      continue;
    }
    if (/^[-*] /.test(line)) {
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        push('bulletListItem', { ...D }, inline(lines[i].slice(2)));
        i++;
      }
      continue;
    }
    if (/^\d+\. /.test(line)) {
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        push('numberedListItem', { ...D }, inline(lines[i].replace(/^\d+\. /, '')));
        i++;
      }
      continue;
    }
    if (/^(---+|\*\*\*+)$/.test(line.trim())) {
      push('separator', {});
      i++;
      continue;
    }
    if (/^<hr\b/.test(line.trim())) {
      push('divider', {});
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[:\-\s|]+\|$/.test(lines[i])) {
          const cells = lines[i]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          rows.push({ cells: cells.map(cell) });
        }
        i++;
      }
      const cols = rows[0].cells.length;
      push(
        'table',
        { textColor: 'default' },
        { type: 'tableContent', columnWidths: Array(cols).fill(null), rows },
      );
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,6} |> |\||```|[-*] |\d+\. |!\[|<hr\b)/.test(lines[i]) &&
      !/^(---+|\*\*\*+)$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    push('paragraph', { ...D }, inline(para.join(' ')));
  }
}

for (const seg of segments) {
  if (seg.kind === 'md') emitMd(seg.text);
  else if (seg.kind === 'figure') push('svg', { code: seg.svg, caption: seg.caption });
  else if (seg.kind === 'note') push('note', {}, inline(seg.text));
  else if (seg.kind === 'code')
    push('codeBlock', { language: seg.lang }, [{ type: 'text', text: seg.code, styles: {} }]);
  else if (seg.kind === 'component')
    push('customComponent', {
      componentName: seg.name,
      source: componentSource(seg.name),
      ...seg.frame,
    });
}

const doc = {
  kind: 'mlsys-write-source',
  version: 1,
  meta: {
    title: fmVal('title'),
    summary: fmVal('summary'),
    authors: (() => {
      const list = [...fmText.matchAll(/^ {2}- (.+)$/gm)]
        .map((x) => x[1])
        .filter((a) => !/^\d{4}-/.test(a));
      return list.length ? list : ['guest'];
    })(),
    writerName: 'Author Name',
    topicId: fmVal('topicId'),
    topicName: fmVal('topic'),
    tags,
    slug,
    coverFileName: '',
    ogCard: false,
    proposedTopic: '',
    newAuthor: null,
    date: fmVal('date'),
  },
  blocks,
  tableVariants: {},
};

const ids = blocks.map((b) => b.id);
if (new Set(ids).size !== ids.length) throw new Error('duplicate ids');
const allowed = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
  'quote',
  'note',
  'codeBlock',
  'math',
  'separator',
  'divider',
  'table',
  'figure',
  'gallery',
  'video',
  'svg',
  'customComponent',
]);
for (const b of blocks) if (!allowed.has(b.type)) throw new Error('bad type ' + b.type);
for (const b of blocks)
  if (['svg', 'codeBlock'].includes(b.type) === false && b.content) JSON.stringify(b.content);

fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
const counts = {};
for (const b of blocks) counts[b.type] = (counts[b.type] ?? 0) + 1;
console.log('blocks:', blocks.length, JSON.stringify(counts));
console.log('written:', OUT);
