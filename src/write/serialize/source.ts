import type { PostMeta, SBlock, TableStyle } from './toMdx';

export const SOURCE_FILENAME = '.write-source.json';

type Source = {
  kind: 'mlsys-write-source';
  version: 1;
  meta: PostMeta;
  blocks: SBlock[];
  tableVariants: Record<string, TableStyle>;
};

export type ParsedSource = Omit<Source, 'kind' | 'version'>;

// Committed alongside each post so it can be re-opened losslessly in the editor.
export function buildSource(
  meta: PostMeta,
  blocks: SBlock[],
  tableVariants: Record<string, TableStyle>,
): string {
  const source: Source = { kind: 'mlsys-write-source', version: 1, meta, blocks, tableVariants };
  return `${JSON.stringify(source, null, 2)}\n`;
}

export function parseSource(text: string): ParsedSource | null {
  try {
    const data = JSON.parse(text) as Partial<Source>;
    if (data.kind !== 'mlsys-write-source' || !data.meta || !Array.isArray(data.blocks))
      return null;
    return {
      meta: data.meta,
      blocks: data.blocks as SBlock[],
      tableVariants: data.tableVariants ?? {},
    };
  } catch {
    return null;
  }
}
