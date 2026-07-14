import type { NewAuthor } from './toMdx';

export const AUTHORS_DIR = 'src/content/authors';

export function authorPath(handle: string): string {
  return `${AUTHORS_DIR}/${handle}.json`;
}

export function buildAuthorJson(author: NewAuthor): string {
  const data: Record<string, string> = { name: author.name.trim() };
  const bio = author.bio?.trim();
  if (bio) data.bio = bio;
  data.role = 'contributor';
  for (const key of ['website', 'github', 'twitter', 'linkedin', 'email'] as const) {
    const value = author[key]?.trim();
    if (value) data[key] = value;
  }
  return `${JSON.stringify(data, null, 2)}\n`;
}
