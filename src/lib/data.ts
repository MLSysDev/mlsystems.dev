// Client-safe helpers shared across pages and islands.
// Taxonomy and tool data live in src/content/ collections (see lib/topics.ts).

/** URL-safe slug for a free-text tag (e.g. "KV-cache" → "kv-cache"). */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function sortPostsByDate<T extends { id: string; data: { date: Date } }>(
  a: T,
  b: T,
): number {
  const d = +b.data.date - +a.data.date;
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
