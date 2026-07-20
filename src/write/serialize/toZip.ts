import JSZip from 'jszip';
import type { NewAuthor, SerializedPost } from './toMdx';
import { SOURCE_FILENAME } from './source';
import { authorPath, buildAuthorJson } from './author';

export type ZipInput = {
  serialized: SerializedPost;
  slug: string;
  assets: { name: string; file: File }[];
  sourceJson: string;
  newAuthor?: NewAuthor | null;
};

export async function buildZip(input: ZipInput): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(input.slug);
  if (!folder) throw new Error('zip folder creation failed');
  folder.file('index.mdx', input.serialized.mdx);
  folder.file(SOURCE_FILENAME, input.sourceJson);
  const wanted = new Set(input.serialized.assetNames);
  if (input.serialized.cover) wanted.add(input.serialized.cover);
  for (const { name, file } of input.assets) {
    if (wanted.has(name)) folder.file(name, file);
  }
  for (const { fileName, source } of input.serialized.componentFiles) {
    folder.file(fileName, `${source.trimEnd()}\n`);
  }
  if (input.newAuthor?.handle) {
    zip.file(authorPath(input.newAuthor.handle), buildAuthorJson(input.newAuthor));
  }
  return zip.generateAsync({ type: 'blob' });
}
