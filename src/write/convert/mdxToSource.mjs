// Converts a published post's MDX into write-source JSON. Shared by the /write
// portal (browser) and docs/authoring/mdx-to-write-source.mjs (CLI) — keep it
// dependency-free and side-effect-free.

const D = { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' };

// Every delimiter carries `(?<!\\)`: markdown lets a backslash make any of them
// literal, and without the guard `\$4.00 … \$8.00` reads as inline math because
// the escaping backslash is itself the non-space character the closing $ needs.
const INLINE_PATTERNS = [
  // Inline math stays verbatim — no smart quotes, no bold/italic parsing inside.
  { re: /(?<!\\)\$(\S(?:[^$\n]*\S)?)(?<!\\)\$/g, kind: 'math' },
  { re: /(?<!\\)\*\*`([^`]+)`\*\*/g, kind: 'code' },
  { re: /(?<!\\)`([^`]+)`/g, kind: 'code' },
  { re: /(?<![!\\])\[([^\]]+)\]\(([^)\s]+)\)/g, kind: 'link' },
  { re: /(?<!\\)\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g, kind: 'style', key: 'bold' },
  { re: /(?<!\\)__([^_]+)__/g, kind: 'style', key: 'bold' },
  { re: /(?<!\\)~~([^~]+)~~/g, kind: 'style', key: 'strike' },
  // Inline HTML the serializer emits or a writer hand-types. Unmatched, it
  // becomes literal text whose `<` the serializer then escapes — so an
  // unhandled tag is destroyed on republish, not ignored.
  { re: /(?<!\\)<u>([\s\S]*?)<\/u>/g, kind: 'style', key: 'underline' },
  { re: /(?<!\\)<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/g, kind: 'style', key: 'bold' },
  { re: /(?<!\\)<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/g, kind: 'style', key: 'italic' },
  { re: /(?<!\\)<(?:s|del)>([\s\S]*?)<\/(?:s|del)>/g, kind: 'style', key: 'strike' },
  { re: /(?<!\\)<code>([\s\S]*?)<\/code>/g, kind: 'code' },
  // Background outermost, matching the serializer. The combined form is first so
  // it wins the tie against the background-only pattern at the same position.
  {
    re: /(?<!\\)<span style="background-color: ([^"]+)"><span style="color: ([^"]+)">((?:(?!<\/span>)[\s\S])*)<\/span><\/span>/g,
    kind: 'colorbg',
  },
  {
    re: /(?<!\\)<span style="background-color: ([^"]+)">((?:(?!<\/span>)[\s\S])*)<\/span>/g,
    kind: 'bg',
  },
  {
    re: /(?<!\\)<span style="color: ([^"]+)">((?:(?!<\/span>)[\s\S])*)<\/span>/g,
    kind: 'color',
  },
  { re: /(?<!\\)\*([^*\n]+)\*/g, kind: 'style', key: 'italic' },
  { re: /(?<![\w`\\])_([^_\n]+)_(?![\w`])/g, kind: 'style', key: 'italic' },
];

// BlockNote stores colours by name, so pull the name back out of
// `var(--tc-red, #e03e3e)`. An unrecognised colour has no home and is dropped.
const paletteName = (value, prefix) =>
  value.match(new RegExp(`var\\(--${prefix}-([a-z]+)`))?.[1] ?? null;

// Reverse of the serializer's escapeProse. Runs on plain-text runs only, after
// markup has matched, so an escaped delimiter is never read as markup on the way
// in nor shown with its backslash on the way out.
function unescapeProse(s) {
  return s
    .replace(/^(\s{0,3})\\([>#+-])/, '$1$2')
    .replace(/^(\s{0,3})(\d+)\\([.)])/, '$1$2$3')
    .replace(/\\([\\<{*_`[~$])/g, '$1');
}

function smartQuotes(s) {
  return s
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s([{—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{—–-])'/g, '$1‘')
    .replace(/'/g, '’');
}

function inline(text, inherited = {}) {
  // Shift+Enter is published as <br />; BlockNote stores it as a literal newline.
  text = text.replace(/<br\s*\/?>/g, '\n');
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
      runs.push({
        type: 'text',
        text: smartQuotes(unescapeProse(text.slice(pos))),
        styles: { ...inherited },
      });
      break;
    }
    if (best.m.index > pos)
      runs.push({
        type: 'text',
        text: smartQuotes(unescapeProse(text.slice(pos, best.m.index))),
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
    } else if (p.kind === 'colorbg') {
      const bg = paletteName(m[1], 'mark');
      const fg = paletteName(m[2], 'tc');
      runs.push(
        ...inline(m[3], {
          ...inherited,
          ...(bg ? { backgroundColor: bg } : {}),
          ...(fg ? { textColor: fg } : {}),
        }),
      );
    } else if (p.kind === 'bg') {
      const bg = paletteName(m[1], 'mark');
      runs.push(...inline(m[2], { ...inherited, ...(bg ? { backgroundColor: bg } : {}) }));
    } else if (p.kind === 'color') {
      const fg = paletteName(m[1], 'tc');
      runs.push(...inline(m[2], { ...inherited, ...(fg ? { textColor: fg } : {}) }));
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

function figureSegment(attrs, inner, imports = new Map(), consts = new Map()) {
  const caption = frameAttr(attrs, 'caption').replace(/\s+/g, ' ').trim();
  const width = Number(attrs.match(/width=\{(\d+)\}/)?.[1] ?? '') || '';

  // The live-render form: source held in an export const and referenced by
  // data-source. Unmatched it becomes literal text whose < the serializer then
  // escapes, so an unhandled diagram is destroyed rather than ignored.
  const live = inner.match(/^<pre\s+className="mermaid"([^>]*)>([\s\S]*?)<\/pre>$/);
  if (live) {
    const ref = (live[1].match(/data-source=\{(\w+)\}/) ?? [])[1];
    const inlineRef = (live[2].trim().match(/^\{(\w+)\}$/) ?? [])[1];
    const source =
      (ref && consts.get(ref)) ||
      (inlineRef && consts.get(inlineRef)) ||
      live[2].replace(/^\{`|`\}$/g, '').trim();
    if (source) return { kind: 'mermaid', caption, source, svg: '' };
  }
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
  // A local image is written `<Image src={ident} />`, where ident is an import
  // binding — the import lines are the only route back to a filename.
  const local = inner.match(/^<Image\s+src=\{(\w+)\}([^>]*)\/>$/);
  if (local && imports.has(local[1])) {
    return {
      kind: 'image',
      alt: local[2].match(/alt="([^"]*)"/)?.[1] ?? '',
      src: `./${imports.get(local[1])}`,
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
  let body = fm ? src.slice(fm[0].length) : src;
  const fmText = fm ? fm[1] : '';
  const fmVal = (key) => {
    const m = fmText.match(new RegExp(`^${key}: (.*)$`, 'm'));
    if (!m) return '';
    const raw = m[1];
    const quoted = raw.match(/^(["'])([\s\S]*)\1$/);
    if (!quoted) return raw;
    // YAML doubles a quote inside a single-quoted scalar. Reading it back
    // without undoubling fed the escaped form into the next serialize, so a
    // title with an apostrophe grew a pair of quotes on every round-trip.
    return quoted[1] === "'" ? quoted[2].replace(/''/g, "'") : quoted[2];
  };
  // The editor quotes its output, but a hand-written entry is as likely to use
  // YAML's bare form, which JSON.parse rejects.
  const parseFlowList = (raw) =>
    raw
      .trim()
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) =>
        s
          .trim()
          .replace(/^(['"])([\s\S]*)\1$/, '$2')
          .trim(),
      )
      .filter(Boolean);

  const tagsMatch = fmText.match(/^tags: (\[.*\])$/m);
  const tags = tagsMatch ? parseFlowList(tagsMatch[1]) : [];

  // Frontmatter is the only record of draft state, so reading it here is what
  // lets the checkbox reflect a hand-written entry and stops a re-publish from
  // silently publishing it.
  const draft = /^draft:[ \t]*true[ \t]*$/m.test(fmText);

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
    /(<Figure([^>]*?)\/>)|(<Figure([^>]*)>\s*([\s\S]*?)\s*<\/Figure>)|(<Note>\s*([\s\S]*?)\s*<\/Note>)|(```(\w*)\n([\s\S]*?)```)|(<Interactive\b([^>]*)>\s*<([A-Za-z]\w*)\s+client:visible\s*\/>\s*<\/Interactive>)|(<([A-Z]\w*)\s+client:visible\s*\/>)|(<Table\b([^>]*)>\s*([\s\S]*?)\s*<\/Table>)|(<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)\s*<\/details>)|(<Gallery([^>]*)>\s*([\s\S]*?)\s*<\/Gallery>)|(<Video\b([^>]*?)\/>)/g;

  // ident -> filename, from the entry's own import lines. `<Image src={ident} />`
  // names its file only through the binding.
  const imports = new Map();
  for (const im of body.matchAll(/^import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"];?\s*$/gm))
    imports.set(im[1], im[2]);

  // Diagram sources live in template literals so the markup can reference them
  // twice. Collect them, then take them out of the body — left in, they would
  // be read as prose and published as escaped text.
  const consts = new Map();
  body = body.replace(/^export\s+const\s+(\w+)\s*=\s*`([\s\S]*?)`;?\s*$/gm, (_all, name, value) => {
    consts.set(name, value.replace(/\\`/g, '`').trim());
    return '';
  });

  let cursor = 0;
  const segments = [];
  let m;
  while ((m = pattern.exec(body))) {
    if (m.index > cursor) segments.push({ kind: 'md', text: body.slice(cursor, m.index) });
    if (m[1]) {
      // Figure.astro takes a src prop instead of children, and someone will.
      const src = frameAttr(m[2], 'src');
      segments.push(
        src
          ? {
              kind: 'image',
              src,
              alt: frameAttr(m[2], 'alt'),
              caption: frameAttr(m[2], 'caption'),
              width: Number(m[2].match(/width=\{(\d+)\}/)?.[1] ?? '') || 360,
            }
          : { kind: 'md', text: m[1] },
      );
    } else if (m[3]) {
      segments.push(figureSegment(m[4] ?? '', m[5].trim(), imports, consts));
    } else if (m[6]) segments.push({ kind: 'note', text: m[7].replace(/\s+/g, ' ').trim() });
    else if (m[8]) {
      const code = m[10].replace(/\n$/, '');
      if ((m[9] || '') === 'mermaid') segments.push({ kind: 'mermaid', source: code });
      else segments.push({ kind: 'code', lang: m[9] || 'text', code });
    } else if (m[11]) segments.push({ kind: 'component', name: m[13], frame: frameProps(m[12]) });
    else if (m[14])
      segments.push({
        kind: 'component',
        name: m[15],
        frame: { frameTitle: '', frameCaption: '', frameSize: 'normal', frameExpand: false },
      });
    else if (m[16]) {
      const caption = frameAttr(m[17], 'caption');
      segments.push({
        kind: 'table',
        text: m[18],
        style: {
          border: m[17].match(/variant="(\w+)"/)?.[1] ?? 'rule',
          zebra: /(^|\s)zebra(\s|$|=)/.test(m[17]),
          ...(caption ? { caption } : {}),
        },
      });
    } else if (m[19]) {
      segments.push({ kind: 'details', summary: m[20].trim(), body: m[21] });
    } else if (m[22]) {
      // A gallery entry is either a stored asset's filename, written
      // `<Image src={ident} />`, or an absolute URL, written as a plain <img>.
      const files = [...m[24].matchAll(/<(Image|img)\s+([^>]*?)\/>/g)].map((g) => {
        const ident = g[2].match(/src=\{(\w+)\}/)?.[1];
        return {
          file: ident ? imports.get(ident) : g[2].match(/src="([^"]+)"/)?.[1],
          alt: g[2].match(/alt="([^"]*)"/)?.[1] ?? '',
        };
      });
      if (files.length > 0 && files.every((f) => f.file)) {
        segments.push({
          kind: 'gallery',
          fileNames: files.map((f) => f.file),
          alts: files.map((f) => f.alt),
          min: Number(m[23].match(/min=\{(\d+)\}/)?.[1] ?? '') || '',
        });
      } else {
        segments.push({ kind: 'md', text: m[22] });
      }
    } else if (m[25]) {
      const id = m[26].match(/id="([^"]*)"/)?.[1] ?? '';
      if (id) segments.push({ kind: 'video', videoId: id, caption: frameAttr(m[26], 'caption') });
      else segments.push({ kind: 'md', text: m[25] });
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
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim();
        const code = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          code.push(lines[i]);
          i++;
        }
        i++;
        push('codeBlock', { language: lang || 'text' }, [
          { type: 'text', text: code.join('\n'), styles: {} },
        ]);
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
      const paraStart = i;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#{2,6} |> |\||```|[-*] |\d+\. |!\[|<hr\b|\$\$)/.test(lines[i]) &&
        !/^(---+|\*\*\*+)$/.test(lines[i].trim())
      ) {
        para.push(lines[i]);
        i++;
      }
      if (i === paraStart) {
        para.push(lines[i]);
        i++;
      }
      // The serializer wraps a paragraph in <p> when it opens with a tag, so
      // MDX keeps it a paragraph. Unwrap before reading the inline marks.
      const joined = para.join(' ').trim();
      const unwrapped = /^<p>[\s\S]*<\/p>$/.test(joined) ? joined.slice(3, -4) : joined;
      push('paragraph', { ...D }, inline(unwrapped));
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
    else if (seg.kind === 'gallery')
      push('gallery', {
        fileNames: JSON.stringify(seg.fileNames),
        alts: JSON.stringify(seg.alts),
        min: seg.min,
      });
    else if (seg.kind === 'video') push('video', { videoId: seg.videoId, caption: seg.caption });
    else if (seg.kind === 'details') {
      const before = blocks.length;
      emitMd(seg.body);
      const children = blocks.splice(before);
      push('toggleListItem', { ...D }, inline(seg.summary), children);
    }
  }

  const doc = {
    kind: 'mlsys-write-source',
    version: 1,
    meta: {
      title: fmVal('title'),
      summary: fmVal('summary'),
      authors: (() => {
        const inlineList = fmText.match(/^authors: (\[.*\])$/m);
        if (inlineList) return parseFlowList(inlineList[1]);
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
      // Frontmatter the editor can set but the converter used to ignore, so a
      // hand-edit to either was dropped when the entry was reopened.
      coverFileName: (fmVal('cover').match(/^\.\/(.+)$/) ?? [])[1] ?? '',
      ogCard: /^ogCard:[ \t]*true[ \t]*$/m.test(fmText),
      draft,
      proposedTopic: '',
      newAuthor: null,
      date: fmVal('date'),
    },
    blocks,
    tableVariants,
  };

  // A component with no editor block survives conversion as literal text, and
  // the serializer then escapes its `<` — so re-publishing turns it into visible
  // markup. The editor cannot represent it, but it can refuse to do so quietly.
  const stray = new Set();
  const scan = (list) => {
    for (const b of list) {
      if (Array.isArray(b.content)) {
        for (const run of b.content) {
          // A generic like `RowMapper<T>` inside a code span is not a component.
          if (run?.styles?.code) continue;
          for (const m of String(run?.text ?? '').matchAll(/<([A-Z]\w*)[\s/>]/g)) stray.add(m[1]);
        }
      }
      if (b.children?.length) scan(b.children);
    }
  };
  scan(blocks);
  for (const name of stray) {
    warnings.push(
      `<${name}> has no editor block — it will be turned into plain text if you publish from here. Edit this entry's index.mdx by hand instead.`,
    );
  }

  const ids = blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate ids');
  for (const b of blocks) if (!ALLOWED_TYPES.has(b.type)) throw new Error('bad type ' + b.type);
  for (const b of blocks)
    if (['svg', 'codeBlock'].includes(b.type) === false && b.content) JSON.stringify(b.content);

  return { doc, warnings };
}
