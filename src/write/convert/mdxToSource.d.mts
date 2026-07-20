import type { PostMeta, SBlock, TableStyle } from '../serialize/toMdx';

export type ConvertedSource = {
  doc: {
    kind: 'mlsys-write-source';
    version: 1;
    meta: PostMeta;
    blocks: SBlock[];
    tableVariants: Record<string, TableStyle>;
  };
  warnings: string[];
};

export function convertMdx(
  src: string,
  opts?: { slug?: string; componentSource?: (name: string) => string },
): ConvertedSource;
