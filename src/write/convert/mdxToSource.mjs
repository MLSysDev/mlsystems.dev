// Converts a published post's MDX into write-source JSON. Shared by the /write
// portal (browser) and docs/authoring/mdx-to-write-source.mjs (CLI) — keep it
// dependency-free and side-effect-free.

const D = { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' };

const INLINE_PATTERNS = [
  // Inline math stays verbatim — no smart quotes, no bold/italic parsing inside.
  { re: /\$(\S(?:[^$\n]*\S)?)\$/g, kind: 'math' },
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
    if (p.kind === 'math') {
      runs.push({ type: 'text', text: m[0], styles: { ...inherited } });
    } else if (p.kind === 'code') {
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

function unwrapJsxStyle(svg) {
  return svg.replace(
    /<style([^>]*)>\{`([\s\S]*?)`\}<\/style>/g,
    (_m, attrs, css) => `<style${attrs}>${css.replace(/\\([\\`$])/g, '$1')}</style>`,
  );
}

function figureSegment(attrs, inner) {
  const caption = frameAttr(attrs, 'caption').replace(/\s+/g, ' ').trim();
  const width = Number(attrs.match(/width=\{(\d+)\}/)?.[1] ?? '') || '';
  // A leading {/* mermaid ... */} comment carries the editable diagram source.
  const mmd = inner.match(/^\{\/\*\s*mermaid\s*\n([\s\S]*?)\n\*\/\}\s*/);
  if (mmd) {
    const source = mmd[1].trim();
    const svg = unwrapJsxStyle(inner.slice(mmd[0].length).trim());
    if (source && /^<svg[\s>]/.test(svg)) {
      return { kind: 'mermaid', caption, source, svg };
    }
  }
  if (/^<svg[\s>]/.test(inner)) {
    return { kind: 'figure', caption, svg: unwrapJsxStyle(inner), width };
  }
  const img =
    inner.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/) ?? inner.match(/^<img[^>]*\ssrc="([^"]+)"[^>]*>$/);
  if (img) {
    const md = inner.startsWith('![');
    return {
      kind: 'image',
      alt: md ? img[1] : (inner.match(/\salt="([^"]*)"/)?.[1] ?? ''),
      src: md ? img[2] : img[1],
      caption,
      width: width || 360,
    };
  }
  return { kind: 'md', text: inner };
}

const ALLOWED_TYPES = new Set([
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
  'mermaid',
  'customComponent',
]);

export function convertMdx(src, { slug = 'post-slug', componentSource } = {}) {
  const warnings = [];
  const getComponentSource =
    componentSource ??
    ((name) => {
      warnings.push(`Component ${name}: paste its code into the block to see it run.`);
      return '';
    });

  const fm = src.match(/^---\n([\s\S]*?)\n---\n/);
  const body = fm ? src.slice(fm[0].length) : src;
  const fmText = fm ? fm[1] : '';
  const fmVal = (key) => {
    const m = fmText.match(new RegExp(`^${key}: (.*)$`, 'm'));
    return m ? m[1].replace(/^(["'])(.*)\1$/, '$2') : '';
  };
  const tagsMatch = fmText.match(/^tags: (\[.*\])$/m);
  const tags = tagsMatch ? JSON.parse(tagsMatch[1].replace(/'/g, '"')) : [];

  let n = 0;
  const id = (p) => `${p}-${++n}`;

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

  const pattern =
    /(<Figure([^>]*)>\s*([\s\S]*?)\s*<\/Figure>)|(<Note>\s*([\s\S]*?)\s*<\/Note>)|(```(\w*)\n([\s\S]*?)```)|(<Interactive\b([^>]*)>\s*<([A-Za-z]\w*)\s+client:visible\s*\/>\s*<\/Interactive>)|(<([A-Z]\w*)\s+client:visible\s*\/>)|(<Table\b([^>]*)>\s*([\s\S]*?)\s*<\/Table>)/g;

  let cursor = 0;
  const segments = [];
  let m;
  while ((m = pattern.exec(body))) {
    if (m.index > cursor) segments.push({ kind: 'md', text: body.slice(cursor, m.index) });
    if (m[1]) {
      segments.push(figureSegment(m[2] ?? '', m[3].trim()));
    } else if (m[4]) segments.push({ kind: 'note', text: m[5].replace(/\s+/g, ' ').trim() });
    else if (m[6]) {
      const code = m[8].replace(/\n$/, '');
      if ((m[7] || '') === 'mermaid') segments.push({ kind: 'mermaid', source: code });
      else segments.push({ kind: 'code', lang: m[7] || 'text', code });
    } else if (m[9]) segments.push({ kind: 'component', name: m[11], frame: frameProps(m[10]) });
    else if (m[12])
      segments.push({
        kind: 'component',
        name: m[13],
        frame: { frameTitle: '', frameCaption: '', frameSize: 'normal', frameExpand: false },
      });
    else if (m[14]) {
      const caption = frameAttr(m[15], 'caption');
      segments.push({
        kind: 'table',
        text: m[16],
        style: {
          border: m[15].match(/variant="(\w+)"/)?.[1] ?? 'rule',
          zebra: /(^|\s)zebra(\s|$|=)/.test(m[15]),
          ...(caption ? { caption } : {}),
        },
      });
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < body.length) segments.push({ kind: 'md', text: body.slice(cursor) });

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
      const math = line.trim().match(/^\$\$(.*)$/);
      if (math) {
        const oneLine = math[1].trim().match(/^(.*\S)\s*\$\$$/);
        if (oneLine) {
          push('math', { latex: oneLine[1] });
        } else {
          const latex = math[1].trim() ? [math[1].trim()] : [];
          i++;
          while (i < lines.length && lines[i].trim() !== '$$') {
            latex.push(lines[i]);
            i++;
          }
          push('math', { latex: latex.join('\n').trim() });
        }
        i++;
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
        !/^(#{2,6} |> |\||```|[-*] |\d+\. |!\[|<hr\b|\$\$)/.test(lines[i]) &&
        !/^(---+|\*\*\*+)$/.test(lines[i].trim())
      ) {
        para.push(lines[i]);
        i++;
      }
      push('paragraph', { ...D }, inline(para.join(' ')));
    }
  }

  const tableVariants = {};

  for (const seg of segments) {
    if (seg.kind === 'md') emitMd(seg.text);
    else if (seg.kind === 'table') {
      const before = blocks.length;
      emitMd(seg.text);
      const tbl = blocks.slice(before).find((b) => b.type === 'table');
      if (tbl) tableVariants[tbl.id] = seg.style;
    } else if (seg.kind === 'figure')
      push('svg', { code: seg.svg, caption: seg.caption, width: seg.width || 620 });
    else if (seg.kind === 'note') push('note', {}, inline(seg.text));
    else if (seg.kind === 'image')
      push('figure', {
        fileName: '',
        src: seg.src,
        alt: seg.alt,
        caption: seg.caption,
        width: seg.width,
      });
    else if (seg.kind === 'code')
      push('codeBlock', { language: seg.lang }, [{ type: 'text', text: seg.code, styles: {} }]);
    else if (seg.kind === 'mermaid') {
      if (!seg.svg) {
        warnings.push('Mermaid diagram: it will draw once the block is opened in the editor.');
      }
      push('mermaid', { source: seg.source, svg: seg.svg ?? '', caption: seg.caption ?? '' });
    } else if (seg.kind === 'component')
      push('customComponent', {
        componentName: seg.name,
        source: getComponentSource(seg.name),
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
        const inlineList = fmText.match(/^authors: (\[.*\])$/m);
        if (inlineList) return JSON.parse(inlineList[1].replace(/'/g, '"'));
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
    tableVariants,
  };

  const ids = blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate ids');
  for (const b of blocks) if (!ALLOWED_TYPES.has(b.type)) throw new Error('bad type ' + b.type);
  for (const b of blocks)
    if (['svg', 'codeBlock'].includes(b.type) === false && b.content) JSON.stringify(b.content);

  return { doc, warnings };
}
