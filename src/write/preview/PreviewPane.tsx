import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import katex from 'katex';
import { mdxComponents as C } from '@/components/MDXComponents';
import Interactive from '@/components/Interactive';
import LiveComponent from './LiveComponent';
import { getAssetUrl } from '../storage/assets';
import { sanitizeSvg } from '../lib/sanitizeSvg';
import {
  BG_COLORS,
  INLINE_MATH_RE,
  TEXT_COLORS,
  type InlineRun,
  type PostMeta,
  type SBlock,
  type TableStyle,
} from '../serialize/toMdx';
import CodeHighlight from './CodeHighlight';

// Renders the draft with the same components and CSS classes the published
// article uses (MDXComponents + .article-body styles from global.css), so the
// preview is the real reading experience — not an approximation.

function textWithMath(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let pos = 0;
  let m;
  INLINE_MATH_RE.lastIndex = 0;
  while ((m = INLINE_MATH_RE.exec(text))) {
    if (m.index > pos) parts.push(text.slice(pos, m.index));
    parts.push(
      <span
        key={m.index}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(m[1], { throwOnError: false }),
        }}
      />,
    );
    pos = m.index + m[0].length;
  }
  if (parts.length === 0) return text;
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

function styledRun(run: { text: string; styles: Record<string, boolean | string> }, key: number) {
  const { text, styles } = run;
  let node: ReactNode;
  // Mirror toMdx.wrapStyles: inline code publishes as plain backticks, so
  // bold/italic/strike are dropped with it — the preview must not show them.
  if (styles.code) {
    node = <code>{text}</code>;
  } else {
    node = textWithMath(text);
    if (styles.bold) node = <strong>{node}</strong>;
    if (styles.italic) node = <em>{node}</em>;
    if (styles.strike) node = <s>{node}</s>;
  }
  if (styles.underline) node = <u>{node}</u>;
  const style: CSSProperties = {};
  if (typeof styles.textColor === 'string' && styles.textColor && styles.textColor !== 'default') {
    style.color = `var(--tc-${styles.textColor}, ${TEXT_COLORS[styles.textColor] ?? styles.textColor})`;
  }
  if (typeof styles.backgroundColor === 'string' && styles.backgroundColor !== 'default') {
    style.backgroundColor = `var(--mark-${styles.backgroundColor}, ${BG_COLORS[styles.backgroundColor] ?? styles.backgroundColor})`;
  }
  return (
    <span key={key} style={Object.keys(style).length ? style : undefined}>
      {node}
    </span>
  );
}

function runs(content: unknown): ReactNode {
  if (!Array.isArray(content)) return null;
  return (content as InlineRun[]).map((run, i) => {
    if (run.type === 'link') {
      return (
        <a key={i} href={run.href} target="_blank" rel="noreferrer">
          {run.content.map((r, j) => styledRun(r, j))}
        </a>
      );
    }
    if (run.type === 'text') return styledRun(run, i);
    return null;
  });
}

function plainText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return (content as InlineRun[])
    .map((run) =>
      run.type === 'link' ? run.content.map((r) => r.text).join('') : (run.text ?? ''),
    )
    .join('');
}

function alignStyle(block: SBlock): CSSProperties | undefined {
  const a = block.props.textAlignment;
  return typeof a === 'string' && a !== 'left' ? { textAlign: a as 'center' | 'right' } : undefined;
}

function cellRuns(cell: unknown): ReactNode {
  if (Array.isArray(cell)) return runs(cell);
  if (cell && typeof cell === 'object' && 'content' in cell) {
    return runs((cell as { content: unknown }).content);
  }
  return null;
}

function tableRows(block: SBlock): unknown[][] {
  const rows = ((block.content as { rows?: unknown[] })?.rows ?? []) as unknown[];
  return rows.map((row) => {
    const cells = (row as { cells?: unknown[] }).cells;
    return Array.isArray(cells) ? cells : [];
  });
}

type Variants = Record<string, TableStyle>;

function renderTable(block: SBlock, variants: Variants) {
  const rows = tableRows(block);
  if (rows.length === 0) return null;
  const style = variants[block.id];
  const border = style?.border ?? 'rule';
  const zebra = style?.zebra ?? false;
  const caption = style?.caption?.trim() ?? '';
  const table = (
    <div className={`table-wrap table--${border}${zebra ? ' table--zebra' : ''}`}>
      <table>
        <thead>
          <tr>
            {rows[0].map((cell, i) => (
              <th key={i}>{cellRuns(cell)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((cells, r) => (
            <tr key={r}>
              {cells.map((cell, i) => (
                <td key={i}>{cellRuns(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (!caption) {
    return <div key={block.id}>{table}</div>;
  }
  return (
    <div key={block.id} className={`table-variant table--${border}${zebra ? ' table--zebra' : ''}`}>
      {table}
      <div className="inline-figure-caption">{caption}</div>
    </div>
  );
}

function detailsFor(block: SBlock, variants: Variants) {
  return (
    <details key={block.id}>
      <summary>{runs(block.content) ?? 'Details'}</summary>
      {block.children?.length ? renderBlocks(block.children, variants) : null}
    </details>
  );
}

function renderOne(block: SBlock, variants: Variants): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return plainText(block.content) ? (
        <p key={block.id} style={alignStyle(block)}>
          {runs(block.content)}
        </p>
      ) : null;
    case 'heading': {
      if (block.props.isToggleable) return detailsFor(block, variants);
      const level = Math.min(Number(block.props.level ?? 1), 3);
      const Tag = (['h2', 'h3', 'h4'] as const)[level - 1];
      return (
        <Tag key={block.id} style={alignStyle(block)}>
          {runs(block.content)}
        </Tag>
      );
    }
    case 'toggleListItem':
      return detailsFor(block, variants);
    case 'quote':
      return (
        <blockquote key={block.id} style={alignStyle(block)}>
          {runs(block.content)}
        </blockquote>
      );
    case 'codeBlock':
      return (
        <CodeHighlight
          key={block.id}
          code={plainText(block.content)}
          lang={String(block.props.language ?? '')}
        />
      );
    case 'separator':
      return <hr key={block.id} className="article-hr" />;
    case 'divider':
      return <hr key={block.id} className="article-hr article-hr--line" />;
    case 'math': {
      const latex = String(block.props.latex ?? '');
      return latex ? (
        <div
          key={block.id}
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(latex, { displayMode: true, throwOnError: false }),
          }}
        />
      ) : null;
    }
    case 'note': {
      const inner = runs(block.content);
      return inner ? <C.Note key={block.id}>{inner}</C.Note> : null;
    }
    case 'figure': {
      const fileName = String(block.props.fileName ?? '');
      const src = fileName ? getAssetUrl(fileName) : String(block.props.src ?? '');
      if (!src) return null;
      const width = block.props.width;
      return (
        <C.Figure
          key={block.id}
          caption={String(block.props.caption ?? '') || undefined}
          width={width !== '' && width != null ? Number(width) : undefined}
        >
          <img src={src} alt={String(block.props.alt ?? '')} />
        </C.Figure>
      );
    }
    case 'svg': {
      const code = sanitizeSvg(String(block.props.code ?? '')).trim();
      if (!code) return null;
      const width = block.props.width;
      return (
        <C.Figure
          key={block.id}
          caption={String(block.props.caption ?? '') || undefined}
          width={width !== '' && width != null ? Number(width) : undefined}
        >
          <div dangerouslySetInnerHTML={{ __html: code }} />
        </C.Figure>
      );
    }
    case 'mermaid': {
      const rendered = sanitizeSvg(String(block.props.svg ?? '')).trim();
      if (!rendered) return null;
      return (
        <C.Figure
          key={block.id}
          caption={String(block.props.caption ?? '') || undefined}
          width={960}
        >
          <div className="mermaid-fig" dangerouslySetInnerHTML={{ __html: rendered }} />
        </C.Figure>
      );
    }
    case 'gallery': {
      const names = JSON.parse(String(block.props.fileNames || '[]')) as string[];
      if (names.length === 0) return null;
      const alts = JSON.parse(String(block.props.alts || '[]')) as string[];
      const min = block.props.min;
      return (
        <C.Gallery key={block.id} min={min !== '' && min != null ? Number(min) : undefined}>
          {names.map((f, i) => (
            <img key={f} src={getAssetUrl(f)} alt={alts[i] ?? ''} />
          ))}
        </C.Gallery>
      );
    }
    case 'video': {
      const id = String(block.props.videoId ?? '');
      return id ? (
        <C.Video key={block.id} id={id} caption={String(block.props.caption ?? '') || undefined} />
      ) : null;
    }
    case 'customComponent': {
      const name = String(block.props.componentName ?? '');
      const source = String(block.props.source ?? '');
      const placeholder = source.trim() ? (
        <LiveComponent name={name} source={source} />
      ) : (
        <div className="write-preview-component">
          ⚡ Interactive component {name ? `<${name}>` : ''} — add code to see it run
        </div>
      );
      const title = String(block.props.frameTitle ?? '').trim();
      const caption = String(block.props.frameCaption ?? '').trim();
      const wide = block.props.frameSize === 'wide';
      const expand = Boolean(block.props.frameExpand);
      if (!title && !caption && !wide && !expand) return <div key={block.id}>{placeholder}</div>;
      return (
        <Interactive
          key={block.id}
          title={title || undefined}
          caption={caption || undefined}
          size={wide ? 'wide' : 'normal'}
          expand={expand}
        >
          {placeholder}
        </Interactive>
      );
    }
    case 'table':
      return renderTable(block, variants);
    default:
      return plainText(block.content) ? <p key={block.id}>{runs(block.content)}</p> : null;
  }
}

function renderBlocks(blocks: SBlock[], variants: Variants): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const type = blocks[i].type;
    if (type === 'bulletListItem' || type === 'numberedListItem' || type === 'checkListItem') {
      const items: SBlock[] = [];
      while (i < blocks.length && blocks[i].type === type) items.push(blocks[i++]);
      const lis = items.map((it) => (
        <li key={it.id} className={type === 'checkListItem' ? 'task-list-item' : undefined}>
          {type === 'checkListItem' && (
            <input type="checkbox" checked={Boolean(it.props.checked)} readOnly />
          )}
          <span>
            {runs(it.content)}
            {it.children?.length ? renderBlocks(it.children, variants) : null}
          </span>
        </li>
      ));
      out.push(
        type === 'numberedListItem' ? (
          <ol key={items[0].id}>{lis}</ol>
        ) : (
          <ul
            key={items[0].id}
            className={type === 'checkListItem' ? 'contains-task-list' : undefined}
          >
            {lis}
          </ul>
        ),
      );
      continue;
    }
    out.push(renderOne(blocks[i], variants));
    i++;
  }
  return out;
}

type Props = {
  meta: PostMeta;
  blocks: SBlock[];
  tableVariants: Variants;
  byline: string;
};

export function PreviewPane({ meta, blocks, tableVariants, byline }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (root?.querySelector('.mermaid-fig svg')) {
      import('@/lib/diagramZoom').then(({ initDiagramZoom }) => initDiagramZoom(root));
    }
  }, [blocks]);
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  return (
    <div className="write-preview" ref={rootRef}>
      <div className="write-preview-head">
        <h1 className="write-preview-title">{meta.title || 'Untitled'}</h1>
        {meta.summary && <p className="write-preview-lede">{meta.summary}</p>}
        <div className="write-preview-byline">
          {byline} · {meta.date || date}
        </div>
      </div>
      {meta.coverFileName && (
        <img className="write-preview-cover" src={getAssetUrl(meta.coverFileName)} alt="" />
      )}
      <div className="article-body">{renderBlocks(blocks, tableVariants)}</div>
    </div>
  );
}
