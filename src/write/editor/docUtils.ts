import type { SBlock, TableStyle } from '../serialize/toMdx';

export const BORDER_VARIANTS: TableStyle['border'][] = ['rule', 'lined', 'plain'];
export const DEFAULT_TABLE_STYLE: TableStyle = { border: 'rule', zebra: false };

export function tableVariantCss(variants: Record<string, TableStyle>): string {
  return Object.entries(variants)
    .map(([id, style]) => {
      if (!style || typeof style !== 'object') return '';
      const sel = `.bn-editor [data-id="${id}"] [data-content-type='table']`;
      const rules: string[] = [];
      if (style.border === 'lined') {
        rules.push(
          `${sel} :is(td, th) { border: 1px solid var(--line); padding-left: 12px; padding-right: 12px; }`,
        );
      }
      if (style.border === 'plain') {
        rules.push(`${sel} tr:not(:first-child) > * { border-bottom: none; }`);
      }
      if (style.zebra) {
        rules.push(
          `${sel} tr:not(:first-child):nth-child(odd) > * { background: var(--paper-2); }`,
        );
      }
      return rules.join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

export function collectImages(blocks: SBlock[]): string[] {
  const out: string[] = [];
  const walk = (list: SBlock[]) => {
    for (const b of list) {
      if (b.type === 'figure' && b.props.fileName) out.push(String(b.props.fileName));
      if (b.type === 'gallery') {
        try {
          out.push(...(JSON.parse(String(b.props.fileNames || '[]')) as string[]));
        } catch {
          // ignore a malformed gallery — it just won't offer cover options
        }
      }
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  return [...new Set(out.filter(Boolean))];
}
