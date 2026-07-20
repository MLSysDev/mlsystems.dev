import fs from 'node:fs';
import { convertMdx } from '../../src/write/convert/mdxToSource.mjs';

let SRC = process.argv[2];
if (!SRC) {
  console.error(
    'usage: node docs/authoring/mdx-to-write-source.mjs <post-dir-or-index.mdx> [out.json]',
  );
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error(`not found: ${SRC}`);
  process.exit(1);
}
if (fs.statSync(SRC).isDirectory()) SRC = SRC.replace(/\/$/, '') + '/index.mdx';
const slug = SRC.split('/').filter(Boolean).at(-2) ?? 'post-slug';
const OUT = process.argv[3] ?? `${slug}.write-source.json`;
const DIR = SRC.replace(/\/index\.mdx$/, '');

const { doc, warnings } = convertMdx(fs.readFileSync(SRC, 'utf8'), {
  slug,
  componentSource: (name) => {
    const file = `${DIR}/${name}.tsx`;
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    console.warn(`warning: ${name}.tsx not found next to index.mdx — source left empty`);
    return '';
  },
});

for (const w of warnings) console.warn(`note: ${w}`);

fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
const counts = {};
for (const b of doc.blocks) counts[b.type] = (counts[b.type] ?? 0) + 1;
console.log('blocks:', doc.blocks.length, JSON.stringify(counts));
console.log('written:', OUT);
