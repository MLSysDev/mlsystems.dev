import JSZip from 'jszip';
import type { SerializedPost } from './toMdx';
import { SOURCE_FILENAME } from './source';

export type ZipInput = {
  serialized: SerializedPost;
  slug: string;
  writerName: string;
  repoUrl: string;
  contactEmail: string;
  assets: { name: string; file: File }[];
  sourceJson: string;
};

function submitNote(
  slug: string,
  writerName: string,
  repoUrl: string,
  contactEmail: string,
): string {
  return `# How to submit your article

Written by: ${writerName || '(name not given)'}

This ZIP contains a ready-to-publish post folder for mlsystems.dev.
Pick whichever option is easiest for you.

## Option 1 — open a pull request

1. Fork ${repoUrl}
2. Copy the \`${slug}/\` folder into \`src/content/posts/\`
3. Open a pull request — see CONTRIBUTING.md in the repo

## Option 2 — open an issue

Open an issue at ${repoUrl}/issues, mention you have an article ready,
and attach this ZIP. A maintainer will take it from there.

## Option 3 — email it to us

Email this ZIP to ${contactEmail} and we'll publish it for you.

If this is your first article, include your author details so we can set up
your profile page:

- Display name
- Short bio (1–2 sentences)
- Any links you'd like shown: website, GitHub, X/Twitter, LinkedIn, Mastodon, Bluesky, email

Share only what you want public — anything you leave out simply won't appear.

Thanks for writing!
`;
}

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
  zip.file(
    'HOW-TO-SUBMIT.md',
    submitNote(input.slug, input.writerName, input.repoUrl, input.contactEmail),
  );
  return zip.generateAsync({ type: 'blob' });
}
