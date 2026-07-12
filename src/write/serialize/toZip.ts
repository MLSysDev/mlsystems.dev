import JSZip from 'jszip';
import type { SerializedPost } from './toMdx';

export type ZipInput = {
  serialized: SerializedPost;
  slug: string;
  writerName: string;
  repoUrl: string;
  assets: { name: string; file: File }[];
};

function submitNote(slug: string, writerName: string, repoUrl: string): string {
  return `# How to submit your article

Written by: ${writerName || '(name not given)'}

This ZIP contains a ready-to-publish post folder for mlsystems.dev.

## Option 1 — open a pull request

1. Fork ${repoUrl}
2. Copy the \`${slug}/\` folder into \`src/content/posts/\`
3. Open a pull request — see CONTRIBUTING.md in the repo

## Option 2 — let us do it

Open an issue at ${repoUrl}/issues, mention you have an article ready,
and attach this ZIP. A maintainer will take it from there.

Thanks for writing!
`;
}

export async function buildZip(input: ZipInput): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(input.slug);
  if (!folder) throw new Error('zip folder creation failed');
  folder.file('index.mdx', input.serialized.mdx);
  const wanted = new Set(input.serialized.assetNames);
  for (const { name, file } of input.assets) {
    if (wanted.has(name)) folder.file(name, file);
  }
  for (const { fileName, source } of input.serialized.componentFiles) {
    folder.file(fileName, `${source.trimEnd()}\n`);
  }
  zip.file('HOW-TO-SUBMIT.md', submitNote(input.slug, input.writerName, input.repoUrl));
  return zip.generateAsync({ type: 'blob' });
}
