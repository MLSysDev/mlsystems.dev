import { describe, expect, it } from 'vitest';
import {
  escapeText,
  serializeInline,
  serializePost,
  type InlineRun,
  type PostMeta,
  type SBlock,
} from './toMdx';

const t = (text: string, styles: Record<string, boolean | string> = {}): InlineRun => ({
  type: 'text',
  text,
  styles,
});

const block = (
  type: string,
  props: Record<string, string | number | boolean> = {},
  content?: unknown,
  children?: SBlock[],
): SBlock => ({
  id: `id-${type}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  props,
  content,
  children,
});

const meta: PostMeta = {
  title: 'Test post',
  summary: 'A summary.',
  author: 'guest',
  writerName: '',
  topicId: 'inference',
  topicName: 'Inference & Serving',
  tags: [],
  slug: 'test-post',
  coverFileName: '',
};

const today = new Date('2026-07-12T10:00:00Z');

function body(
  blocks: SBlock[],
  overrides: Partial<PostMeta> = {},
  tableVariants: Record<string, string> = {},
) {
  const { mdx } = serializePost({ ...meta, ...overrides }, blocks, { tableVariants, today });
  return mdx.split('---\n\n').slice(1).join('---\n\n').trimEnd();
}

describe('escapeText', () => {
  it('escapes MDX-breaking characters', () => {
    expect(escapeText('a < b {c} *d* _e_ `f` [g] \\h')).toBe(
      'a \\< b \\{c} \\*d\\* \\_e\\_ \\`f\\` \\[g] \\\\h',
    );
  });

  it('escapes leading blockquote and heading markers', () => {
    expect(escapeText('> not a quote')).toBe('\\> not a quote');
    expect(escapeText('# not a heading')).toBe('\\# not a heading');
  });

  it('leaves dollar signs alone so inline math passes through', () => {
    expect(escapeText('the scale is $1/\\sqrt{d_k}$')).toContain('$');
  });
});

describe('serializeInline', () => {
  it('renders styles', () => {
    expect(
      serializeInline([t('plain '), t('bold', { bold: true }), t(' '), t('it', { italic: true })]),
    ).toBe('plain **bold** _it_');
  });

  it('combines bold and italic', () => {
    expect(serializeInline([t('both', { bold: true, italic: true })])).toBe('_**both**_');
  });

  it('renders code spans without escaping', () => {
    expect(serializeInline([t('q @ k.T * 2', { code: true })])).toBe('`q @ k.T * 2`');
  });

  it('handles backticks inside code spans', () => {
    expect(serializeInline([t('a `tick`', { code: true })])).toBe('`` a `tick` ``');
  });

  it('renders links with styled content', () => {
    expect(
      serializeInline([
        { type: 'link', href: 'https://example.com', content: [t('a '), t('b', { bold: true })] },
      ]),
    ).toBe('[a **b**](https://example.com)');
  });

  it('renders strikethrough', () => {
    expect(serializeInline([t('gone', { strike: true })])).toBe('~~gone~~');
  });
});

describe('block serialization', () => {
  it('maps heading levels down one (title is H1)', () => {
    expect(body([block('heading', { level: 1 }, [t('Top')])])).toBe('## Top');
    expect(body([block('heading', { level: 2 }, [t('Mid')])])).toBe('### Mid');
    expect(body([block('heading', { level: 3 }, [t('Low')])])).toBe('#### Low');
  });

  it('groups consecutive list items and nests children', () => {
    const out = body([
      block('bulletListItem', {}, [t('one')]),
      block('bulletListItem', {}, [t('two')], [block('bulletListItem', {}, [t('sub')])]),
      block('paragraph', {}, [t('after')]),
    ]);
    expect(out).toBe('- one\n- two\n  - sub\n\nafter');
  });

  it('numbers ordered lists sequentially', () => {
    const out = body([
      block('numberedListItem', {}, [t('first')]),
      block('numberedListItem', {}, [t('second')]),
    ]);
    expect(out).toBe('1. first\n2. second');
  });

  it('renders quotes', () => {
    expect(body([block('quote', {}, [t('wise words')])])).toBe('> wise words');
  });

  it('renders fenced code blocks without escaping', () => {
    const out = body([
      block('codeBlock', { language: 'python' }, [t('def f(x):\n    return x * 2')]),
    ]);
    expect(out).toBe('```python\ndef f(x):\n    return x * 2\n```');
  });

  it('renders separators', () => {
    expect(body([block('separator')])).toBe('---');
  });

  it('renders math blocks', () => {
    expect(body([block('math', { latex: 'E = mc^2' })])).toBe('$$\nE = mc^2\n$$');
  });

  it('skips empty paragraphs', () => {
    expect(body([block('paragraph', {}, []), block('paragraph', {}, [t('kept')])])).toBe('kept');
  });
});

describe('video blocks', () => {
  it('renders with caption', () => {
    expect(body([block('video', { videoId: 'dQw4w9WgXcQ', caption: 'On TDD.' })])).toBe(
      '<Video id="dQw4w9WgXcQ" caption="On TDD." />',
    );
  });

  it('omits empty caption', () => {
    expect(body([block('video', { videoId: 'dQw4w9WgXcQ', caption: '' })])).toBe(
      '<Video id="dQw4w9WgXcQ" />',
    );
  });

  it('uses an expression for captions containing double quotes', () => {
    expect(body([block('video', { videoId: 'abcdefghijk', caption: 'He said "hi"' })])).toBe(
      '<Video id="abcdefghijk" caption={"He said \\"hi\\""} />',
    );
  });
});

describe('note blocks', () => {
  it('renders inline content inside Note', () => {
    expect(body([block('note', {}, [t('do not '), t('miss', { bold: true })])])).toBe(
      '<Note>do not **miss**</Note>',
    );
  });
});

describe('figures and galleries', () => {
  it('hoists imports and wraps captioned figures', () => {
    const { mdx, assetNames } = serializePost(
      meta,
      [
        block('figure', {
          fileName: 'flash-attention.png',
          alt: 'Tiling',
          caption: 'HBM traffic.',
          width: 900,
        }),
      ],
      { tableVariants: {}, today },
    );
    expect(mdx).toContain("import { Image } from 'astro:assets';");
    expect(mdx).toContain("import flashAttention from './flash-attention.png';");
    expect(mdx).toContain(
      '<Figure caption="HBM traffic." width={900}>\n  <Image src={flashAttention} alt="Tiling" />\n</Figure>',
    );
    expect(assetNames).toEqual(['flash-attention.png']);
  });

  it('renders bare Image when no caption', () => {
    const out = body([block('figure', { fileName: 'a.png', alt: 'A', caption: '', width: '' })]);
    expect(out).toContain('<Image src={a} alt="A" />');
    expect(out).not.toContain('<Figure');
  });

  it('dedupes import identifiers', () => {
    const out = body([
      block('figure', { fileName: 'a-b.png', alt: 'x', caption: '', width: '' }),
      block('figure', { fileName: 'a_b.png', alt: 'y', caption: '', width: '' }),
    ]);
    expect(out).toContain("import aB from './a-b.png';");
    expect(out).toContain("import aB2 from './a_b.png';");
  });

  it('renders galleries with min', () => {
    const out = body([
      block('gallery', {
        fileNames: JSON.stringify(['one.png', 'two.png']),
        alts: JSON.stringify(['One', 'Two']),
        min: 160,
      }),
    ]);
    expect(out).toContain(
      '<Gallery min={160}>\n  <Image src={one} alt="One" />\n  <Image src={two} alt="Two" />\n</Gallery>',
    );
  });
});

describe('custom component blocks', () => {
  it('hoists the import, emits usage, and returns the file', () => {
    const source = 'export default function Viz() {\n  return <div>hi</div>;\n}';
    const { mdx, componentFiles } = serializePost(
      meta,
      [block('customComponent', { componentName: 'Viz', source })],
      { tableVariants: {}, today },
    );
    expect(mdx).toContain("import Viz from './Viz';");
    expect(mdx).toContain('<Viz client:visible />');
    expect(componentFiles).toEqual([{ fileName: 'Viz.tsx', source }]);
  });
});

describe('tables', () => {
  const tableContent = {
    type: 'tableContent',
    rows: [{ cells: [[t('Model')], [t('Params')]] }, { cells: [[t('7B')], [t('7 | 8')]] }],
  };

  it('renders pipe tables with escaped pipes', () => {
    const out = body([block('table', {}, tableContent)]);
    expect(out).toBe('| Model | Params |\n| --- | --- |\n| 7B | 7 \\| 8 |');
  });

  it('wraps in Table when a non-default variant is set', () => {
    const tb = block('table', {}, tableContent);
    const out = body([tb], {}, { [tb.id]: 'zebra' });
    expect(out).toBe(
      '<Table variant="zebra">\n\n| Model | Params |\n| --- | --- |\n| 7B | 7 \\| 8 |\n\n</Table>',
    );
  });

  it('supports object-shaped cells', () => {
    const objTable = {
      type: 'tableContent',
      rows: [
        { cells: [{ type: 'tableCell', content: [t('H')] }] },
        { cells: [{ type: 'tableCell', content: [t('v')] }] },
      ],
    };
    expect(body([block('table', {}, objTable)])).toBe('| H |\n| --- |\n| v |');
  });
});

describe('frontmatter', () => {
  it('emits required fields with quoting and computed values', () => {
    const words = Array.from({ length: 440 }, (_, i) => `w${i}`).join(' ');
    const { mdx } = serializePost(
      { ...meta, title: "It's alive", tags: ['attention', 'kernels'], coverFileName: 'hero.png' },
      [block('paragraph', {}, [t(words)])],
      { tableVariants: {}, today },
    );
    const fm = mdx.split('---')[1];
    expect(fm).toContain("title: 'It''s alive'");
    expect(fm).toContain("summary: 'A summary.'");
    expect(fm).toContain("authors: ['guest']");
    expect(fm).toContain("date: '2026-07-12'");
    expect(fm).toContain('readMin: 2');
    expect(fm).toContain("topic: 'Inference & Serving'");
    expect(fm).toContain("topicId: 'inference'");
    expect(fm).toContain("tags: ['attention', 'kernels']");
    expect(fm).toContain("cover: './hero.png'");
  });

  it('omits optional fields when unset and floors readMin at 1', () => {
    const { mdx } = serializePost(meta, [block('paragraph', {}, [t('short')])], {
      tableVariants: {},
      today,
    });
    const fm = mdx.split('---')[1];
    expect(fm).not.toContain('tags:');
    expect(fm).not.toContain('cover:');
    expect(fm).toContain('readMin: 1');
  });
});
