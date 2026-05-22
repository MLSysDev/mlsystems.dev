import type { APIRoute } from 'astro';
import { getCollection, getEntries } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { generateOgPng } from '@/lib/og';
import { pngResponseWithFallback } from '@/lib/og-response';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft && !data.cover);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: CollectionEntry<'posts'> };
  return pngResponseWithFallback(async () => {
    const authors = await getEntries(post.data.authors);
    return generateOgPng({
      title: post.data.title,
      authorNames: authors.map((a) => a.data.name).join(', '),
      topic: post.data.topic,
    });
  }, `post:${post.id}`);
};
