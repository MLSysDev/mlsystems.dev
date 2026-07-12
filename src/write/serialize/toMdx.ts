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

export type PostMeta = {
  title: string;
  summary: string;
  author: string;
  writerName: string;
  topicId: string;
  topicName: string;
  tags: string[];
  slug: string;
  coverFileName: string;
};

export type SerializeOptions = {
  tableVariants: Record<string, string>;
  today: Date;
  wordsPerMinute?: number;
};

export type SerializedPost = {
  mdx: string;
  assetNames: string[];
  componentFiles: { fileName: string; source: string }[];
};

type Ctx = {
  imports: { ident: string; fileName: string }[];
  idents: Set<string>;
  componentFiles: { fileName: string; source: string }[];
  componentImports: string[];
  tableVariants: Record<string, string>;
};

export function escapeText(s: string): string {
  return s.replace(/[\\<{*_`[]/g, (c) => `\\${c}`).replace(/^([>#])/, '\\$1');
}

function wrapStyles(text: string, styles: Record<string, boolean | string>): string {
  if (styles.code) {
    return text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``;
  }
  let out = escapeText(text);
  if (styles.bold) out = `**${out}**`;
  if (styles.italic) out = `_${out}_`;
  if (styles.strike) out = `~~${out}~~`;
  return out;
}

export function serializeInline(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return (content as InlineRun[])
    .map((run) => {
      if (run.type === 'link') {
        const label = run.content.map((r) => wrapStyles(r.text, r.styles)).join('');
        return `[${label}](${run.href})`;
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
  const variant = ctx.tableVariants[block.id];
  if (variant && variant !== 'rule') {
    return `<Table variant="${variant}">\n\n${table}\n\n</Table>`;
  }
  return table;
}

function serializeFigure(block: SBlock, ctx: Ctx): string {
  const fileName = String(block.props.fileName ?? '');
  if (!fileName) return '';
  const image = imageLine(fileName, String(block.props.alt ?? ''), ctx);
  const caption = String(block.props.caption ?? '');
  if (!caption) return image;
  const width = block.props.width;
  const widthAttr = width !== '' && width != null ? ` width={${Number(width)}}` : '';
  return `<Figure ${attr('caption', caption)}${widthAttr}>\n  ${image}\n</Figure>`;
}

function serializeGallery(block: SBlock, ctx: Ctx): string {
  const fileNames = JSON.parse(String(block.props.fileNames || '[]')) as string[];
  if (fileNames.length === 0) return '';
  const alts = JSON.parse(String(block.props.alts || '[]')) as string[];
  const min = block.props.min;
  const minAttr = min !== '' && min != null ? ` min={${Number(min)}}` : '';
  const images = fileNames.map((f, i) => `  ${imageLine(f, alts[i] ?? '', ctx)}`).join('\n');
  return `<Gallery${minAttr}>\n${images}\n</Gallery>`;
}

function serializeComponent(block: SBlock, ctx: Ctx): string {
  const name = String(block.props.componentName ?? '');
  const source = String(block.props.source ?? '');
  if (!name || !source) return '';
  if (!ctx.componentFiles.some((c) => c.fileName === `${name}.tsx`)) {
    ctx.componentFiles.push({ fileName: `${name}.tsx`, source });
    ctx.componentImports.push(`import ${name} from './${name}';`);
  }
  return `<${name} client:visible />`;
}

function serializeBlock(block: SBlock, ctx: Ctx, listNumber: number): string {
  switch (block.type) {
    case 'paragraph':
      return serializeInline(block.content);
    case 'heading': {
      const level = Math.min(Number(block.props.level ?? 1), 3);
      return `${'#'.repeat(level + 1)} ${serializeInline(block.content)}`;
    }
    case 'bulletListItem':
    case 'numberedListItem': {
      const marker = block.type === 'bulletListItem' ? '- ' : `${listNumber}. `;
      let out = marker + serializeInline(block.content);
      if (block.children?.length) {
        out += `\n${indent(serializeBlocks(block.children, ctx), marker.length)}`;
      }
      return out;
    }
    case 'quote':
      return `> ${serializeInline(block.content)}`;
    case 'codeBlock': {
      const lang = String(block.props.language ?? '');
      return `\`\`\`${lang}\n${rawText(block.content)}\n\`\`\``;
    }
    case 'separator':
      return '---';
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
    case 'customComponent':
      return serializeComponent(block, ctx);
    case 'table':
      return serializeTable(block, ctx);
    default:
      return serializeInline(block.content);
  }
}

function isListItem(type?: string): boolean {
  return type === 'bulletListItem' || type === 'numberedListItem';
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
  const lines = [
    `title: ${yaml(meta.title)}`,
    `summary: ${yaml(meta.summary)}`,
    `authors: [${yaml(meta.author)}]`,
    `date: ${yaml(opts.today.toISOString().slice(0, 10))}`,
    `readMin: ${readMin}`,
    `topic: ${yaml(meta.topicName)}`,
    `topicId: ${yaml(meta.topicId)}`,
  ];
  if (meta.tags.length > 0) lines.push(`tags: [${meta.tags.map(yaml).join(', ')}]`);
  if (meta.coverFileName) lines.push(`cover: ${yaml(`./${meta.coverFileName}`)}`);
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
    componentFiles: ctx.componentFiles,
  };
}
