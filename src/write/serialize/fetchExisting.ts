import { restoreAsset } from '../storage/assets';
import { parseSource, SOURCE_FILENAME, type ParsedSource } from './source';
import { convertMdx } from '../convert/mdxToSource.mjs';
import type { SBlock } from './toMdx';

export const NOT_FOUND_MESSAGE = 'No editable post found at that link. Please try manual update.';

export const BAD_SOURCE_MESSAGE =
  'The editor data for that post is unreadable. Edit its index.mdx by hand instead.';

export const NETWORK_MESSAGE =
  'Could not reach GitHub to load that post. Check your connection and try again.';

function rawBase(repoUrl: string, slug: string, branch = 'main'): string {
  const clean = repoUrl
    .replace(/\/+$/, '')
    .replace('https://github.com/', 'https://raw.githubusercontent.com/');
  return `${clean}/${branch}/src/content/posts/${slug}/`;
}

export function slugFromInput(input: string): string {
  const t = input.trim();
  const blog = t.match(/\/blog\/([a-z0-9][a-z0-9-]*)/i);
  if (blog) return blog[1];
  const posts = t.match(/posts\/([a-z0-9][a-z0-9-]*)/i);
  if (posts) return posts[1];
  return t.replace(/\/+$/, '').split('/').pop() ?? t;
}

function imageNames(blocks: SBlock[], cover: string): string[] {
  const out: string[] = [];
  const walk = (list: SBlock[]) => {
    for (const b of list) {
      if (b.type === 'figure' && b.props.fileName) out.push(String(b.props.fileName));
      if (b.type === 'gallery') {
        try {
          out.push(...(JSON.parse(String(b.props.fileNames || '[]')) as string[]));
        } catch {
          // malformed gallery — skip it
        }
      }
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  if (cover) out.push(cover);
  return [...new Set(out.filter(Boolean))];
}

// Fallback for posts committed without editor data: fetch the index.mdx,
// convert it, pull its component files and repo-hosted images.
async function fetchFromMdx(base: string, slug: string): Promise<ParsedSource> {
  let res: Response;
  try {
    res = await fetch(base + 'index.mdx', { cache: 'no-store' });
  } catch {
    throw new Error(NETWORK_MESSAGE);
  }
  if (res.status === 404) throw new Error(NOT_FOUND_MESSAGE);
  if (!res.ok) throw new Error(NETWORK_MESSAGE);
  const text = await res.text();

  try {
    const names = new Set<string>();
    convertMdx(text, {
      slug,
      componentSource: (name) => {
        names.add(name);
        return '';
      },
    });
    const sources = new Map<string, string>();
    await Promise.all(
      [...names].map(async (name) => {
        try {
          const r = await fetch(`${base}${name}.tsx`, { cache: 'no-store' });
          if (r.ok) sources.set(name, await r.text());
        } catch {
          // component stays empty — writer can paste it in
        }
      }),
    );
    const { doc } = convertMdx(text, {
      slug,
      componentSource: (name) => sources.get(name) ?? '',
    });

    const local = doc.blocks.filter(
      (b) => b.type === 'figure' && b.props.src && !/^(https?:|data:)/.test(String(b.props.src)),
    );
    await Promise.all(
      local.map(async (b) => {
        const name = String(b.props.src).split('/').pop() ?? '';
        if (!name) return;
        try {
          const r = await fetch(base + encodeURIComponent(name), { cache: 'no-store' });
          if (!r.ok) return;
          const blob = await r.blob();
          restoreAsset(name, new File([blob], name, { type: blob.type }));
          b.props.fileName = name;
          b.props.src = '';
        } catch {
          // a single missing image shouldn't block opening the post
        }
      }),
    );
    return doc;
  } catch {
    throw new Error(BAD_SOURCE_MESSAGE);
  }
}

// Pulls a published post's editor data + images straight from GitHub (raw),
// so a URL is all the writer needs to re-open it. Never throws for a missing
// image — only for a missing/unreadable post.
export async function fetchExisting(repoUrl: string, input: string): Promise<ParsedSource> {
  const slug = slugFromInput(input);
  const base = rawBase(repoUrl, slug);

  let res: Response;
  try {
    res = await fetch(base + SOURCE_FILENAME, { cache: 'no-store' });
  } catch {
    throw new Error(NETWORK_MESSAGE);
  }
  if (res.status === 404) return fetchFromMdx(base, slug);
  if (!res.ok) throw new Error(NETWORK_MESSAGE);

  const parsed = parseSource(await res.text());
  if (!parsed) throw new Error(BAD_SOURCE_MESSAGE);

  await Promise.all(
    imageNames(parsed.blocks, parsed.meta.coverFileName).map(async (name) => {
      try {
        const r = await fetch(base + encodeURIComponent(name), { cache: 'no-store' });
        if (!r.ok) return;
        const blob = await r.blob();
        restoreAsset(name, new File([blob], name, { type: blob.type }));
      } catch {
        // a single missing image shouldn't block opening the post
      }
    }),
  );
  return parsed;
}
