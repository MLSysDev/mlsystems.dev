import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSource, parseSource } from './source';
import { serializePost } from './toMdx';

const sampleRaw = readFileSync(
  new URL('../../../docs/authoring/sample.write-source.json', import.meta.url),
  'utf8',
);

describe('sample.write-source.json (docs/authoring)', () => {
  it('parses as a valid write-source file', () => {
    const parsed = parseSource(sampleRaw);
    expect(parsed).not.toBeNull();
    expect(parsed!.meta.title).toContain('Sample Post');
    expect(parsed!.blocks.length).toBeGreaterThanOrEqual(20);
    const ids = parsed!.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exercises every supported block type', () => {
    const parsed = parseSource(sampleRaw)!;
    const types = new Set(parsed.blocks.map((b) => b.type));
    for (const t of [
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
      'table',
      'figure',
      'gallery',
      'video',
      'svg',
      'customComponent',
    ])
      expect(types, `missing block type ${t}`).toContain(t);
  });

  it('serializes to MDX without errors and renders every block kind', () => {
    const parsed = parseSource(sampleRaw)!;
    const out = serializePost(parsed.meta, parsed.blocks, {
      tableVariants: parsed.tableVariants,
      today: new Date('2026-07-18'),
    });
    expect(out.mdx).toContain(
      '## A section heading (level 1 — publishes as H2, the title owns H1)',
    );
    expect(out.mdx).toContain('### A subsection heading (level 2 — publishes as H3)');
    expect(out.mdx).not.toContain('#### ');
    expect(out.mdx).toContain('```python');
    expect(out.mdx).toContain('| Input | Encoding | Vector length |');
    expect(out.mdx).toContain('**bold**');
    expect(out.mdx).toContain('[link](https://mlsystems.dev)');
    expect(out.componentFiles.some((f) => f.fileName.includes('ParamCounter'))).toBe(true);
  });

  it('round-trips through buildSource and parses again identically', () => {
    const parsed = parseSource(sampleRaw)!;
    const rebuilt = buildSource(parsed.meta, parsed.blocks, parsed.tableVariants);
    const reparsed = parseSource(rebuilt);
    expect(reparsed).toEqual(parsed);
  });
});

describe('parseSource rejects invalid inputs', () => {
  it('rejects wrong kind', () => {
    expect(parseSource(JSON.stringify({ kind: 'other', meta: {}, blocks: [] }))).toBeNull();
  });
  it('rejects missing blocks array', () => {
    expect(parseSource(JSON.stringify({ kind: 'mlsys-write-source', meta: {} }))).toBeNull();
  });
  it('rejects malformed JSON', () => {
    expect(parseSource('not json at all')).toBeNull();
  });
});
