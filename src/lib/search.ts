export type SearchGroup = 'topic' | 'article' | 'forum' | 'tool' | 'author' | 'page';

export type SearchRow = {
  group: SearchGroup;
  url: string;
  title: string;
  excerpt?: string;
  meta?: string;
};

export const GROUP_ORDER: SearchGroup[] = ['topic', 'article', 'forum', 'tool', 'author', 'page'];

export const GROUP_LABEL: Record<SearchGroup, string> = {
  topic: 'Topics',
  article: 'Articles',
  forum: 'Forum',
  tool: 'Tools',
  author: 'Authors',
  page: 'Pages',
};

export function classifyUrl(url: string): SearchGroup {
  if (url.startsWith('/blog/')) return 'article';
  if (url.startsWith('/forum/')) return 'forum';
  if (url.startsWith('/playground/')) return 'tool';
  if (url.startsWith('/authors/')) return 'author';
  return 'page';
}

export function topicMatches(
  topics: { id: string; name: string; desc: string }[],
  q: string,
): SearchRow[] {
  return topics
    .filter((t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
    .slice(0, 3)
    .map((t) => ({
      group: 'topic' as const,
      url: `/topics/${t.id}`,
      title: t.name,
      excerpt: t.desc,
    }));
}

export function buildMeta(
  group: SearchGroup,
  meta: { topic?: string; read?: string; authors?: string; category?: string },
): string {
  const parts: string[] = [];
  if (group === 'article') {
    if (meta.topic) parts.push(meta.topic);
    if (meta.read) parts.push(meta.read);
    if (meta.authors) parts.push(meta.authors);
  } else if (group === 'forum') {
    parts.push(meta.category ?? 'Discussion');
  } else if (group === 'tool') {
    parts.push('Tool');
  } else if (group === 'author') {
    parts.push('Contributor');
  }
  return parts.join(' · ');
}

export function sortRows(rows: SearchRow[]): SearchRow[] {
  return rows.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}
