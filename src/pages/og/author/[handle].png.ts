import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { generateAuthorOgPng } from '@/lib/og';
import { pngResponseWithFallback } from '@/lib/og-response';

export async function getStaticPaths() {
  const authors = await getCollection('authors');
  return authors.map((author) => ({
    params: { handle: author.id },
    props: { author },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { author } = props as { author: CollectionEntry<'authors'> };
  return pngResponseWithFallback(
    () => generateAuthorOgPng(author.data.name, author.data.bio, author.id),
    `author:${author.id}`,
  );
};
