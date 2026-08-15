import { sanitizeSvg } from '../lib/sanitizeSvg';

export type InlineRun =
  | { type: 'text'; text: string; styles: Record<string, boolean | string> }
  | {
      type: 'link';
      href: string;
      content: Array<{ type: 'text'; text: string; styles: Record<string, boolean | string> }>;
    };

export type SBlock = {
  id: string;
  type: string;
  props: Record<string, string | number | boolean>;
  content?: unknown;
  children?: SBlock[];
};

export type NewAuthor = {
  handle: string;
  name: string;
  bio?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  email?: string;
};

export type PostMeta = {
  title: string;
  summary: string;
  authors: string[];
  writerName: string;
  topicId: string;
  topicName: string;
  tags: string[];
  slug: string;
  coverFileName: string;
  // Opt in to a generated share card (title over the cover) instead of the raw
  // cover. Only meaningful when a cover is set.
  ogCard?: boolean;
  // Holds the post back from every listing, the sitemap and search. It still
  // builds and still answers at its real URL — see `draft` in
  // src/content.config.ts. Round-trips through frontmatter, so a post written by
  // hand and one written here mean the same thing.
  draft?: boolean;
  // Set only when editing an existing post; preserves its original publish date.
  date?: string;
  // A topic the writer proposes that isn't in the list yet — a maintainer (or, later,
  // automation) reads this from the frontmatter and creates it or remaps topicId.
  proposedTopic?: string;
  // Set when the writer registers themselves as a new author; shipped as an
  // authors/<handle>.json file alongside the post.
  newAuthor?: NewAuthor | null;
};

export type TableStyle = { border: 'rule' | 'lined' | 'plain'; zebra: boolean; caption?: string };

export type SerializeOptions = {
  tableVariants: Record<string, TableStyle>;
  today: Date;
  wordsPerMinute?: number;
};

export type SerializedPost = {
  mdx: string;
  assetNames: string[];
  cover?: string;
  componentFiles: { fileName: string; source: string }[];
};

type Ctx = {
  imports: { ident: string; fileName: string }[];
  idents: Set<string>;
  componentFiles: { fileName: string; source: string }[];
  componentImports: string[];
  tableVariants: Record<string, TableStyle>;
};

// Matches remark-math's inline rule: no space just inside either delimiter, and
// neither delimiter escaped — a `\$` is a currency sign, not the start of math.
export const INLINE_MATH_RE = /(?<!\\)\$(\S(?:[^$\n]*\S)?)(?<!\\)\$/g;

function escapeProse(s: string): string {
  return (
    s
      // `$` is escaped for the same reason as `*` and `_`: left bare, a pair of
      // dollar amounts in one paragraph reads as an inline math span. Real math
      // never reaches here — escapeText passes those spans through untouched.
      .replace(/[\\<{*_`[~$]/g, (c) => `\\${c}`)
      .replace(/^(\s{0,3})(\d+)([.)])/, '$1$2\\$3')
      .replace(/^(\s{0,3})([>#+-])/, '$1\\$2')
  );
}

// Inline math spans pass through verbatim — escaping \ or _ inside them would
// hand remark-math broken LaTeX.
export function escapeText(s: string): string {
  let out = '';
  let pos = 0;
  INLINE_MATH_RE.lastIndex = 0;
  let m;
  while ((m = INLINE_MATH_RE.exec(s))) {
    out += escapeProse(s.slice(pos, m.index)) + m[0];
    pos = m.index + m[0].length;
  }
  return out + escapeProse(s.slice(pos));
}

export const TEXT_COLORS: Record<string, string> = {
  gray: '#9b9a97',
  brown: '#64473a',
  red: '#e03e3e',
  orange: '#d9730d',
  yellow: '#cb912f',
  green: '#448361',
  blue: '#337ea9',
  purple: '#9065b0',
  pink: '#c14c8a',
};

export const BG_COLORS: Record<string, string> = {
  gray: '#ebeced',
  brown: '#e9e5e3',
  red: '#fbe4e4',
  orange: '#f6e9d9',
  yellow: '#fbf3db',
  green: '#ddedea',
  blue: '#ddebf1',
  purple: '#eae4f2',
  pink: '#f4dfeb',
};

// Resolve a color to a value safe to inline in a style attribute. Named palette
// entries become CSS vars; free-form values (from pasted markup) are allowed only
// if they're a plain hex/rgb(a)/keyword — otherwise dropped, so a crafted value
// like `red"><script>` can never break out of the attribute.
function safeColor(
  name: string,
  palette: Record<string, string>,
  varPrefix: string,
): string | null {
  if (palette[name]) return `var(--${varPrefix}-${name}, ${palette[name]})`;
  if (/^#[0-9a-f]{3,8}$/i.test(name)) return name;
  if (/^rgba?\([0-9.,%\s/]+\)$/i.test(name)) return name;
  if (/^[a-z]+$/i.test(name)) return name;
  return null;
}

function wrapStyles(text: string, styles: Record<string, boolean | string>): string {
  // Markdown only closes an emphasis run when a non-space sits just inside the
  // marker, so whitespace at the edges of a styled run has to stay outside it.
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text) as RegExpExecArray;
  if (!core) return escapeText(text).replace(/\n/g, '<br />');
  let out: string;
  if (styles.code) {
    out = core.includes('`') ? `\`\` ${core} \`\`` : `\`${core}\``;
  } else {
    out = escapeText(core);
    if (styles.bold) out = `**${out}**`;
    if (styles.italic) out = `_${out}_`;
    if (styles.strike) out = `~~${out}~~`;
  }
  if (styles.underline) out = `<u>${out}</u>`;
  if (typeof styles.textColor === 'string' && styles.textColor && styles.textColor !== 'default') {
    const color = safeColor(styles.textColor, TEXT_COLORS, 'tc');
    if (color) out = `<span style="color: ${color}">${out}</span>`;
  }
  if (typeof styles.backgroundColor === 'string' && styles.backgroundColor !== 'default') {
    const bg = safeColor(styles.backgroundColor, BG_COLORS, 'mark');
    if (bg) out = `<span style="background-color: ${bg}">${out}</span>`;
  }
  // Shift+Enter lands as a literal newline inside the run. A bare newline is a
  // markdown soft break and, inside a quote, ends the blockquote at the next
  // blank line — so publish it as an explicit <br />, which mdxToSource reads
  // back as a newline. Code spans keep raw newlines: a <br /> inside backticks
  // would render as text.
  const result = lead + out + trail;
  return styles.code ? result : result.replace(/\n/g, '<br />');
}

export function serializeInline(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return (content as InlineRun[])
    .map((run) => {
      if (run.type === 'link') {
        const label = run.content.map((r) => wrapStyles(r.text, r.styles)).join('');
        const dest = /[()\s]/.test(run.href) ? `<${run.href}>` : run.href;
        return `[${label}](${dest})`;
      }
      if (run.type === 'text') return wrapStyles(run.text, run.styles);
      return '';
    })
    .join('');
}

function rawText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return (content as InlineRun[])
    .map((run) => {
      if (run.type === 'link') return run.content.map((r) => r.text).join('');
      if (run.type === 'text') return run.text;
      return '';
    })
    .join('');
}

function attr(name: string, value: string): string {
  if (value.includes('"')) return `${name}={${JSON.stringify(value)}}`;
  return `${name}="${value}"`;
}

function identFor(fileName: string, ctx: Ctx): string {
  const existing = ctx.imports.find((i) => i.fileName === fileName);
  if (existing) return existing.ident;
  const stem = fileName.replace(/\.[^.]+$/, '');
  const parts = stem.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  let base = parts
    .map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1)))
    .join('');
  if (!base || /^\d/.test(base)) base = `img${base}`;
  let ident = base;
  let n = 2;
  while (ctx.idents.has(ident)) ident = `${base}${n++}`;
  ctx.idents.add(ident);
  ctx.imports.push({ ident, fileName });
  return ident;
}

function imageLine(fileName: string, alt: string, ctx: Ctx): string {
  return `<Image src={${identFor(fileName, ctx)}} ${attr('alt', alt)} />`;
}

function figureInner(block: SBlock, ctx: Ctx): string {
  const alt = String(block.props.alt ?? '');
  const fileName = String(block.props.fileName ?? '');
  if (fileName) return imageLine(fileName, alt, ctx);
  const src = String(block.props.src ?? '');
  return `<img ${attr('src', src)} ${attr('alt', alt)} />`;
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}

function tableCells(row: unknown): unknown[] {
  const cells = (row as { cells?: unknown[] }).cells;
  return Array.isArray(cells) ? cells : [];
}

function cellContent(cell: unknown): unknown {
  if (Array.isArray(cell)) return cell;
  if (cell && typeof cell === 'object' && 'content' in cell) {
    return (cell as { content: unknown }).content;
  }
  return [];
}

function serializeTable(block: SBlock, ctx: Ctx): string {
  const rows = ((block.content as { rows?: unknown[] })?.rows ?? []) as unknown[];
  if (rows.length === 0) return '';
  const lines = rows.map(
    (row) =>
      `| ${tableCells(row)
        .map((cell) => serializeInline(cellContent(cell)).replace(/\|/g, '\\|'))
        .join(' | ')} |`,
  );
  const cols = tableCells(rows[0]).length;
  lines.splice(1, 0, `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`);
  const table = lines.join('\n');
  const style = ctx.tableVariants[block.id];
  const border = style?.border ?? 'rule';
  const zebra = style?.zebra ?? false;
  const caption = style?.caption?.trim() ?? '';
  if (border !== 'rule' || zebra || caption) {
    const attrs = [
      border !== 'rule' ? `variant="${border}"` : null,
      zebra ? 'zebra' : null,
      caption ? attr('caption', caption) : null,
    ]
      .filter(Boolean)
      .join(' ');
    return `<Table ${attrs}>\n\n${table}\n\n</Table>`;
  }
  return table;
}

function serializeFigure(block: SBlock, ctx: Ctx): string {
  const fileName = String(block.props.fileName ?? '');
  const src = String(block.props.src ?? '');
  if (!fileName && !src) return '';
  const image = figureInner(block, ctx);
  const caption = String(block.props.caption ?? '');
  const width = block.props.width;
  const captionAttr = caption ? ` ${attr('caption', caption)}` : '';
  const widthAttr = width !== '' && width != null ? ` width={${Number(width)}}` : '';
  return `<Figure${captionAttr}${widthAttr}>\n  ${image}\n</Figure>`;
}

function serializeSvg(block: SBlock): string {
  const code = sanitizeSvg(String(block.props.code ?? '')).trim();
  if (!code) return '';
  const caption = String(block.props.caption ?? '');
  const captionAttr = caption ? ` ${attr('caption', caption)}` : '';
  const width = block.props.width;
  const widthAttr = width !== '' && width != null ? ` width={${Number(width)}}` : '';
  // SVG stays at column 0 inside <Figure> — indenting it would let MDX read the
  // markup as an indented code block.
  return `<Figure${captionAttr}${widthAttr}>\n${code}\n</Figure>`;
}

function serializeGallery(block: SBlock, ctx: Ctx): string {
  const fileNames = JSON.parse(String(block.props.fileNames || '[]')) as string[];
  if (fileNames.length === 0) return '';
  const alts = JSON.parse(String(block.props.alts || '[]')) as string[];
  const min = block.props.min;
  const minAttr = min !== '' && min != null ? ` min={${Number(min)}}` : '';
  // A gallery entry is either a stored asset's filename or an absolute URL.
  // Only the former has a file to import.
  const images = fileNames
    .map((f, i) =>
      /^https?:/.test(f)
        ? `  <img ${attr('src', f)} ${attr('alt', alts[i] ?? '')} />`
        : `  ${imageLine(f, alts[i] ?? '', ctx)}`,
    )
    .join('\n');
  return `<Gallery${minAttr}>\n${images}\n</Gallery>`;
}

// MDX parses `{` inside a raw <style> tag as a JSX expression; wrapping the CSS
// in a template-literal expression keeps it valid MDX and identical at runtime.
function jsxSafeStyle(svg: string): string {
  return svg.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_m, attrs, css) => {
    const safe = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    return `<style${attrs}>{\`${safe}\`}</style>`;
  });
}

function serializeMermaid(block: SBlock): string {
  let svg = sanitizeSvg(String(block.props.svg ?? '')).trim();
  // Published pages render no mermaid at runtime, so a diagram has to ship as a
  // drawn SVG. A block that was never opened in the editor has no SVG yet, and
  // returning '' here deleted it outright — fall back to the fenced source so
  // the diagram is at worst shown as code, never lost.
  if (!svg) {
    const src = String(block.props.source ?? '').trim();
    return src ? `\`\`\`mermaid\n${src}\n\`\`\`` : '';
  }
  svg = svg.replace(/\s+xmlns:xlink="[^"]*"/g, '').replace(/xlink:href=/g, 'href=');
  svg = /^<svg[^>]*\sclass="/.test(svg)
    ? svg.replace(/^(<svg[^>]*\sclass=")/, '$1mermaid-diagram ')
    : svg.replace(/^<svg/, '<svg class="mermaid-diagram"');
  svg = jsxSafeStyle(svg);
  // Keep the diagram's source in the MDX as a readable JSX comment (renders
  // nothing): a person can edit the raw mermaid by hand, and reopening the post
  // recovers an editable mermaid block instead of a flattened svg.
  const source = String(block.props.source ?? '').trim();
  const note = source && !source.includes('*/') ? `{/* mermaid\n${source}\n*/}\n` : '';
  const caption = String(block.props.caption ?? '');
  const captionAttr = caption ? ` ${attr('caption', caption)}` : '';
  return `<Figure${captionAttr} width={960}>\n${note}${svg}\n</Figure>`;
}

const INTERACTIVE_IMPORT = "import Interactive from '../../../components/Interactive';";

function serializeComponent(block: SBlock, ctx: Ctx): string {
  const name = String(block.props.componentName ?? '');
  const source = String(block.props.source ?? '');
  if (!name || !source) return '';
  if (!ctx.componentFiles.some((c) => c.fileName === `${name}.tsx`)) {
    ctx.componentFiles.push({ fileName: `${name}.tsx`, source });
    ctx.componentImports.push(`import ${name} from './${name}';`);
  }
  const el = `<${name} client:visible />`;
  const title = String(block.props.frameTitle ?? '').trim();
  const caption = String(block.props.frameCaption ?? '').trim();
  const wide = block.props.frameSize === 'wide';
  const expand = Boolean(block.props.frameExpand);
  if (!title && !caption && !wide && !expand) return el;
  if (!ctx.componentImports.includes(INTERACTIVE_IMPORT)) {
    ctx.componentImports.push(INTERACTIVE_IMPORT);
  }
  const attrs = [
    title ? attr('title', title) : null,
    caption ? attr('caption', caption) : null,
    wide ? 'size="wide"' : null,
    expand ? 'expand' : null,
  ]
    .filter(Boolean)
    .join(' ');
  return `<Interactive ${attrs} client:load>\n  ${el}\n</Interactive>`;
}

function aligned(block: SBlock, s: string): string {
  const a = block.props.textAlignment;
  if (typeof a === 'string' && a !== 'left' && s) {
    return `<div style="text-align: ${a}">\n\n${s}\n\n</div>`;
  }
  return s;
}

function detailsBlock(block: SBlock, ctx: Ctx): string {
  const summary = serializeInline(block.content) || 'Details';
  const body = block.children?.length ? serializeBlocks(block.children, ctx) : '';
  const inner = body ? `\n\n${body}\n\n` : '\n';
  return `<details>\n<summary>${summary}</summary>${inner}</details>`;
}

function serializeBlock(block: SBlock, ctx: Ctx, listNumber: number): string {
  switch (block.type) {
    case 'paragraph': {
      const text = serializeInline(block.content);
      // MDX reads a line opening with a tag as a JSX block, which is not wrapped
      // in <p> and runs into the block after it. Wrapping keeps it a paragraph;
      // mdxToSource unwraps it on the way back in.
      return aligned(block, text.startsWith('<') ? `<p>${text}</p>` : text);
    }
    case 'heading': {
      if (block.props.isToggleable) return detailsBlock(block, ctx);
      const level = Math.min(Number(block.props.level ?? 1), 3);
      return aligned(block, `${'#'.repeat(level + 1)} ${serializeInline(block.content)}`);
    }
    case 'bulletListItem':
    case 'numberedListItem':
    case 'checkListItem': {
      const marker =
        block.type === 'numberedListItem'
          ? `${listNumber}. `
          : block.type === 'checkListItem'
            ? `- [${block.props.checked ? 'x' : ' '}] `
            : '- ';
      let out = marker + serializeInline(block.content);
      if (block.children?.length) {
        out += `\n${indent(serializeBlocks(block.children, ctx), marker.length)}`;
      }
      return out;
    }
    case 'toggleListItem':
      return detailsBlock(block, ctx);
    case 'quote':
      return aligned(block, `> ${serializeInline(block.content)}`);
    case 'codeBlock': {
      const lang = String(block.props.language ?? '');
      return `\`\`\`${lang}\n${rawText(block.content)}\n\`\`\``;
    }
    case 'separator':
      return '---';
    case 'divider':
      return '<hr className="article-hr article-hr--line" />';
    case 'math': {
      const latex = String(block.props.latex ?? '');
      return latex ? `$$\n${latex}\n$$` : '';
    }
    case 'video': {
      const id = String(block.props.videoId ?? '');
      if (!id) return '';
      const caption = String(block.props.caption ?? '');
      return caption ? `<Video id="${id}" ${attr('caption', caption)} />` : `<Video id="${id}" />`;
    }
    case 'note': {
      const inner = serializeInline(block.content);
      return inner ? `<Note>${inner}</Note>` : '';
    }
    case 'figure':
      return serializeFigure(block, ctx);
    case 'gallery':
      return serializeGallery(block, ctx);
    case 'svg':
      return serializeSvg(block);
    case 'mermaid':
      return serializeMermaid(block);
    case 'customComponent':
      return serializeComponent(block, ctx);
    case 'table':
      return serializeTable(block, ctx);
    default:
      return serializeInline(block.content);
  }
}

function isListItem(type?: string): boolean {
  return type === 'bulletListItem' || type === 'numberedListItem' || type === 'checkListItem';
}

function serializeBlocks(blocks: SBlock[], ctx: Ctx): string {
  const parts: string[] = [];
  let listNumber = 0;
  blocks.forEach((block, i) => {
    listNumber = block.type === 'numberedListItem' ? listNumber + 1 : 0;
    if (block.type === 'numberedListItem' && blocks[i - 1]?.type !== 'numberedListItem') {
      listNumber = 1;
    }
    const s = serializeBlock(block, ctx, listNumber);
    if (!s) return;
    if (parts.length > 0 && isListItem(block.type) && isListItem(blocks[i - 1]?.type)) {
      parts[parts.length - 1] += `\n${s}`;
    } else {
      parts.push(s);
    }
  });
  return parts.join('\n\n');
}

function countWords(blocks: SBlock[]): number {
  let words = 0;
  for (const block of blocks) {
    if (block.type !== 'codeBlock' && block.type !== 'math' && block.type !== 'customComponent') {
      words += rawText(block.content).split(/\s+/).filter(Boolean).length;
    }
    if (block.children?.length) words += countWords(block.children);
  }
  return words;
}

function yaml(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildFrontmatter(meta: PostMeta, blocks: SBlock[], opts: SerializeOptions): string {
  const wpm = opts.wordsPerMinute ?? 220;
  const readMin = Math.max(1, Math.round(countWords(blocks) / wpm));
  const todayStr = opts.today.toISOString().slice(0, 10);
  const lines = [
    `title: ${yaml(meta.title)}`,
    `summary: ${yaml(meta.summary)}`,
    `authors: [${(meta.authors.length ? meta.authors : ['guest']).map(yaml).join(', ')}]`,
    `date: ${yaml(meta.date || todayStr)}`,
    `updated: ${yaml(todayStr)}`,
    `readMin: ${readMin}`,
  ];
  // Topic is optional; only emit it when the writer chose one.
  if (meta.topicId) {
    lines.push(`topic: ${yaml(meta.topicName)}`);
    lines.push(`topicId: ${yaml(meta.topicId)}`);
  }
  if (meta.tags.length > 0) lines.push(`tags: [${meta.tags.map(yaml).join(', ')}]`);
  if (meta.proposedTopic?.trim()) lines.push(`proposedTopic: ${yaml(meta.proposedTopic.trim())}`);
  if (meta.coverFileName) lines.push(`cover: ${yaml(`./${meta.coverFileName}`)}`);
  if (meta.coverFileName && meta.ogCard) lines.push('ogCard: true');
  // Only written when set: the schema defaults it to false, so `draft: false` on
  // every published post would be noise.
  if (meta.draft) lines.push('draft: true');
  return `---\n${lines.join('\n')}\n---`;
}

export function serializePost(
  meta: PostMeta,
  blocks: SBlock[],
  opts: SerializeOptions,
): SerializedPost {
  const ctx: Ctx = {
    imports: [],
    idents: new Set(),
    componentFiles: [],
    componentImports: [],
    tableVariants: opts.tableVariants,
  };
  const body = serializeBlocks(blocks, ctx);
  const importLines: string[] = [];
  if (ctx.imports.length > 0) {
    importLines.push(`import { Image } from 'astro:assets';`);
    importLines.push(...ctx.imports.map((i) => `import ${i.ident} from './${i.fileName}';`));
  }
  importLines.push(...ctx.componentImports);
  const sections = [buildFrontmatter(meta, blocks, opts)];
  if (importLines.length > 0) sections.push(importLines.join('\n'));
  if (body) sections.push(body);
  return {
    mdx: `${sections.join('\n\n')}\n`,
    assetNames: ctx.imports.map((i) => i.fileName),
    cover: meta.coverFileName || undefined,
    componentFiles: ctx.componentFiles,
  };
}
