import JSZip from 'jszip';
import type JSZipObject from 'jszip';
import { parseSource, SOURCE_FILENAME, type ParsedSource } from './source';
import { slugify } from './validate';
import { convertMdx } from '../convert/mdxToSource.mjs';

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
};

export type ZipPost = { parsed: ParsedSource; assets: { name: string; file: File }[] };

type Entry = JSZipObject.JSZipObject;

const folderOf = (name: string) => name.slice(0, name.lastIndexOf('/') + 1);

// Reads a post back out of a ZIP, flexibly: the write-source sidecar if present,
// otherwise any valid source .json, otherwise the .mdx converted on the spot
// (with component .tsx files from the same folder). Images load either way.
export async function readPostZip(file: File): Promise<ZipPost> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((f) => !f.dir);

  let parsed: ParsedSource | null = null;
  let folder = '';

  const jsonEntries = [
    ...entries.filter((f) => f.name.endsWith(SOURCE_FILENAME)),
    ...entries.filter((f) => f.name.endsWith('.json') && !f.name.endsWith(SOURCE_FILENAME)),
  ];
  for (const entry of jsonEntries) {
    parsed = parseSource(await entry.async('string'));
    if (parsed) {
      folder = folderOf(entry.name);
      break;
    }
  }

  if (!parsed) {
    const mdx =
      entries.find((f) => f.name === 'index.mdx' || f.name.endsWith('/index.mdx')) ??
      entries.find((f) => /\.mdx?$/i.test(f.name));
    if (!mdx) throw new Error('No post found inside that ZIP.');
    folder = folderOf(mdx.name);
    const components = new Map<string, string>();
    for (const e of entries) {
      if (!e.name.startsWith(folder) || !e.name.endsWith('.tsx')) continue;
      const name = e.name.slice(folder.length);
      if (!name.includes('/')) components.set(name.replace(/\.tsx$/, ''), await e.async('string'));
    }
    const slug = folder.split('/').filter(Boolean).at(-1) ?? '';
    const { doc } = convertMdx(await mdx.async('string'), {
      slug: slug || 'post-slug',
      componentSource: (name) => components.get(name) ?? '',
    });
    if (!slug) doc.meta.slug = slugify(doc.meta.title) || 'post-slug';
    parsed = doc;
  }

  const assets: ZipPost['assets'] = [];
  for (const entry of entries as Entry[]) {
    if (!entry.name.startsWith(folder)) continue;
    const name = entry.name.slice(folder.length);
    if (!name || name.includes('/')) continue;
    const mime = IMAGE_MIME[name.slice(name.lastIndexOf('.') + 1).toLowerCase()];
    if (!mime) continue;
    const bytes = await entry.async('arraybuffer');
    assets.push({ name, file: new File([bytes], name, { type: mime }) });
  }
  return { parsed, assets };
}
