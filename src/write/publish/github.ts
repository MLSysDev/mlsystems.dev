import { SITE } from '@/lib/site';
import type { SerializedPost } from '../serialize/toMdx';

export function isConfigured(): boolean {
  return SITE.githubPostEnabled;
}

export type PublishFile = { path: string; content: string; encoding: 'utf-8' | 'base64' };
export type PublishResult = { url: string; number: number };

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Assembles the exact files a post folder needs: index.mdx, the sidecar, any
// component files, and every referenced image (+ cover) — the same set the ZIP ships.
export async function assemblePostFiles(
  slug: string,
  serialized: SerializedPost,
  sourceJson: string,
  assets: { name: string; file: File }[],
): Promise<PublishFile[]> {
  const dir = `src/content/posts/${slug}`;
  const files: PublishFile[] = [
    { path: `${dir}/index.mdx`, content: serialized.mdx, encoding: 'utf-8' },
    { path: `${dir}/.write-source.json`, content: sourceJson, encoding: 'utf-8' },
  ];
  for (const c of serialized.componentFiles) {
    files.push({
      path: `${dir}/${c.fileName}`,
      content: `${c.source.trimEnd()}\n`,
      encoding: 'utf-8',
    });
  }
  const wanted = new Set(serialized.assetNames);
  if (serialized.cover) wanted.add(serialized.cover);
  for (const { name, file } of assets) {
    if (wanted.has(name)) {
      files.push({ path: `${dir}/${name}`, content: await fileToBase64(file), encoding: 'base64' });
    }
  }
  return files;
}

// Hands the assembled files to our Cloudflare Function, which opens the PR as the
// GitHub App. No auth here — the App's credentials live server-side only.
export async function createPullRequest(opts: {
  slug: string;
  title: string;
  files: PublishFile[];
}): Promise<PublishResult> {
  let data: { url?: string; number?: number; error?: string } = {};
  try {
    const res = await fetch('/api/create-pr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: opts.slug, title: opts.title, files: opts.files }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  } catch (err) {
    throw err instanceof Error ? err : new Error('Could not reach the publishing service.');
  }
  if (!data.url || typeof data.number !== 'number') {
    throw new Error(data.error || 'The pull request could not be created.');
  }
  return { url: data.url, number: data.number };
}
