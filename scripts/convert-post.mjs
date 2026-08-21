#!/usr/bin/env node
// Runs a hand-written (or agent-written) index.mdx through the exact same
// conversion the /write editor applies when you open it, publish it, and it
// round-trips through the editor's block model — without a browser or a
// deploy. See docs/authoring/mdx-format.md's "Checking it before you publish".
//
// Usage: node scripts/convert-post.mjs <path/to/post-dir-or-index.mdx>
//
// Writes/overwrites, next to the mdx:
//   - .write-source.json  (the editor's re-open sidecar)
//   - index.mdx            (rewritten to the editor's canonical form, if it differs)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { convertMdx } from '../src/write/convert/mdxToSource.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// toMdx.ts and source.ts are TypeScript with extensionless relative imports —
// fine for Vite, not resolvable by plain Node ESM. Bundle them once with
// esbuild (already a transitive dep of Astro) instead of adding a TS runtime.
const bundled = await esbuild.build({
  stdin: {
    contents: `
      export { serializePost } from "${repoRoot}/src/write/serialize/toMdx.ts";
      export { buildSource, SOURCE_FILENAME } from "${repoRoot}/src/write/serialize/source.ts";
    `,
    resolveDir: repoRoot,
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { serializePost, buildSource, SOURCE_FILENAME } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/convert-post.mjs <path/to/post-dir-or-index.mdx>');
  process.exit(1);
}

const resolved = resolve(input);
const indexPath = resolved.endsWith('.mdx') ? resolved : join(resolved, 'index.mdx');
if (!existsSync(indexPath)) {
  console.error(`No index.mdx at ${indexPath}`);
  process.exit(1);
}
const dir = dirname(indexPath);
const slug = basename(dir);

// Mirrors fetchExisting.ts's own fallback in the browser: read a referenced
// component's .tsx straight off disk instead of over HTTP.
function componentSource(name) {
  const path = join(dir, `${name}.tsx`);
  if (!existsSync(path)) return undefined;
  return readFileSync(path, 'utf8');
}

function convertAndSerialize(mdxText) {
  const { doc, warnings } = convertMdx(mdxText, { slug, componentSource });
  const serialized = serializePost(doc.meta, doc.blocks, {
    tableVariants: doc.tableVariants,
    today: new Date(),
  });
  return { doc, warnings, serialized };
}

const original = readFileSync(indexPath, 'utf8');
const pass1 = convertAndSerialize(original);

if (pass1.warnings.length > 0) {
  console.log('Warnings from the converter (same ones /write would show):');
  for (const w of pass1.warnings) console.log(`  - ${w}`);
  console.log('');
}

// converting the editor's own output a second time must be a fixed point, or
// the round-trip itself is broken — not just cosmetically reformatted.
const pass2 = convertAndSerialize(pass1.serialized.mdx);
if (pass2.serialized.mdx !== pass1.serialized.mdx) {
  console.error(
    "STOP: this content is not stable under the editor's own round-trip — " +
      'converting the generated index.mdx a second time produced different ' +
      "output. That's a converter/serializer bug, not cosmetic reformatting. " +
      'Nothing was written; investigate before publishing this entry.',
  );
  process.exit(1);
}

writeFileSync(
  join(dir, SOURCE_FILENAME),
  buildSource(pass1.doc.meta, pass1.doc.blocks, pass1.doc.tableVariants),
);
console.log(`Wrote ${SOURCE_FILENAME}`);

if (pass1.serialized.mdx !== original) {
  writeFileSync(indexPath, pass1.serialized.mdx);
  console.log(
    "Rewrote index.mdx to the editor's canonical form — run `git diff` to see " +
      'exactly what publishing from /write would have changed (usually: smart ' +
      'quotes, italics normalized to _underscores_, nested bold/italic re-split ' +
      'into flat spans).',
  );
} else {
  console.log("index.mdx already matches the editor's canonical form — no change.");
}

for (const file of pass1.serialized.componentFiles) {
  const path = join(dir, file.fileName);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current !== file.source) {
    writeFileSync(path, file.source);
    console.log(`Wrote ${file.fileName}`);
  }
}
