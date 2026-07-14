import type { APIRoute } from 'astro';
import { getEntries } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateOgPng } from '@/lib/og';
import { pngResponseWithFallback } from '@/lib/og-response';
import { topicName } from '@/lib/data';

// Per-post OG cards (title/cover composited into a 1200×630 card) are preserved
// here as an opt-in feature but NOT generated — one render + one file per post
// doesn't scale (Cloudflare Pages caps a deploy at 20k files) and adds build
// time that delays the PR preview link. Posts share the raw cover or the single
// prebuilt /og-default.png instead (see src/pages/blog/[slug].astro).
//
// To re-enable: restore the getCollection import and return the mapped posts,
// then repoint ogImage in blog/[slug].astro back to `/og/post/${post.id}.png`.
// Best paired with edge/on-demand caching so cards render once, not per build.
export async function getStaticPaths() {
  return [] as { params: { slug: string }; props: { post: CollectionEntry<'posts'> } }[];
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

// Load the cover as a data URL for compositing. Restricted to PNG/JPEG — the
// formats the SVG rasterizer reliably embeds — so an odd format simply falls
// back to the branded card rather than rendering blank. Returns undefined on
// any problem; the caller then renders the plain card.
async function coverDataUrl(post: CollectionEntry<'posts'>): Promise<string | undefined> {
  const cover = post.data.cover;
  if (!cover) return undefined;

  if (typeof cover === 'string') {
    try {
      const res = await fetch(cover);
      if (!res.ok) return undefined;
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/png') && !type.startsWith('image/jpeg')) return undefined;
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${type};base64,${buf.toString('base64')}`;
    } catch {
      return undefined;
    }
  }

  try {
    const dir = join(process.cwd(), 'src', 'content', 'posts', post.id);
    let raw = '';
    for (const name of ['index.mdx', 'index.md']) {
      try {
        raw = readFileSync(join(dir, name), 'utf8');
        break;
      } catch {
        // try the next extension
      }
    }
    const match = raw.match(/^cover:\s*["']?\.?\/?(.+?)["']?\s*$/m);
    if (!match) return undefined;
    const file = match[1];
    const ext = (file.split('.').pop() ?? '').toLowerCase();
    const mime = MIME[ext];
    if (!mime) return undefined;
    const buf = readFileSync(join(dir, file));
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return undefined;
  }
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: CollectionEntry<'posts'> };
  return pngResponseWithFallback(async () => {
    const authors = await getEntries(post.data.authors);
    const cover = await coverDataUrl(post);
    return generateOgPng(
      {
        title: post.data.title,
        authorNames: authors.map((a) => a.data.name).join(', '),
        topic: topicName(post.data.topicId),
      },
      cover,
    );
  }, `post:${post.id}`);
};
