// Server-only post helpers (astro:content cannot be bundled into client scripts —
// keep this module out of anything imported by <script> code; taxonomy lives in data.ts).
import { getEntries, type CollectionEntry } from 'astro:content';

export type PostWithAuthors = CollectionEntry<'posts'> & {
  authors: CollectionEntry<'authors'>[];
};

export async function resolvePostAuthors(
  posts: CollectionEntry<'posts'>[],
): Promise<PostWithAuthors[]> {
  return Promise.all(posts.map(async (p) => ({ ...p, authors: await getEntries(p.data.authors) })));
}

export function authorNames(post: PostWithAuthors): string {
  return post.authors.map((a) => a.data.name).join(', ');
}
