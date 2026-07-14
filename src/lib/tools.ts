// Server-only: ranking helpers for the tools collection.

import type { CollectionEntry } from 'astro:content';

type Tool = CollectionEntry<'tools'>;

const TAG_ORDER: Record<string, number> = { Live: 0, Beta: 1, Experimental: 2, Soon: 3 };

export function rankTools(tools: Tool[]): Tool[] {
  return [...tools].sort((a, b) => {
    const ta = TAG_ORDER[a.data.tag] ?? 99;
    const tb = TAG_ORDER[b.data.tag] ?? 99;
    if (ta !== tb) return ta - tb;
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return a.data.name.localeCompare(b.data.name);
  });
}

export function pickCoreTools(tools: Tool[], limit = 6): Tool[] {
  return rankTools(tools.filter((t) => t.data.core)).slice(0, limit);
}
