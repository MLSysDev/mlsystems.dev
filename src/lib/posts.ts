// Server-only post helpers (astro:content cannot be bundled into client scripts —
// keep this module out of anything imported by <script> code; taxonomy lives in data.ts).
import { getEntry, type CollectionEntry } from 'astro:content';

type AuthorData = CollectionEntry<'authors'>['data'];

// A resolved author is shaped like an authors-collection entry, but is produced
// defensively: a handle with no profile never throws, it degrades to Guest.
export type ResolvedAuthor = { id: string; data: AuthorData };

export type PostWithAuthors = CollectionEntry<'posts'> & {
  authors: ResolvedAuthor[];
};

const SYNTHETIC_GUEST: ResolvedAuthor = {
  id: 'guest',
  data: { name: 'Guest Contributor', role: 'contributor' } as AuthorData,
};

// Resolve one handle to an author. Missing profile → Guest, with a build-time
// warning so a broken reference is visible in logs without breaking the build.
async function resolveAuthor(handle: string): Promise<ResolvedAuthor> {
  const entry = await getEntry('authors', handle);
  if (entry) return { id: entry.id, data: entry.data };
  console.warn(`[authors] no profile for "${handle}" — falling back to Guest.`);
  const guest = await getEntry('authors', 'guest');
  return guest ? { id: guest.id, data: guest.data } : SYNTHETIC_GUEST;
}

export async function resolveAuthors(handles: string[] = []): Promise<ResolvedAuthor[]> {
  return Promise.all(handles.map(resolveAuthor));
}

export async function resolvePostAuthors(
  posts: CollectionEntry<'posts'>[],
): Promise<PostWithAuthors[]> {
  return Promise.all(
    posts.map(async (p) => ({ ...p, authors: await resolveAuthors(p.data.authors) })),
  );
}

export function authorNames(post: PostWithAuthors): string {
  return post.authors.map((a) => a.data.name).join(', ');
}
