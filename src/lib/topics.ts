// Server-only: reads the topics data collection (src/content/topics/*.json).
// Keep out of client-bundled code — islands receive topics via props instead.

import { getCollection } from 'astro:content';

export type Topic = { id: string; name: string; desc: string };

const entries = await getCollection('topics');

export const TOPICS: Topic[] = entries
  .sort((a, b) => a.data.order - b.data.order)
  .map((e) => ({ id: e.id, name: e.data.name, desc: e.data.desc }));

const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** Canonical display name for a topic ID; falls back to the ID if unknown. */
export function topicName(id: string): string {
  return TOPIC_BY_ID.get(id)?.name ?? id;
}

export function countPostsByTopic<T extends { data: { topicId: string } }>(
  posts: T[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of TOPICS) counts[t.id] = 0;
  for (const p of posts) {
    if (counts[p.data.topicId] !== undefined) counts[p.data.topicId]++;
  }
  return counts;
}
