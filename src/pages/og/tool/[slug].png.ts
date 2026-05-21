import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { generateToolOgPng } from '@/lib/og';
import { pngResponseWithFallback } from '@/lib/og-response';

export async function getStaticPaths() {
  const tools = await getCollection('tools', ({ data }) => !data.draft);
  return tools.map((tool) => ({
    params: { slug: tool.id },
    props: { tool },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { tool } = props as { tool: CollectionEntry<'tools'> };
  return pngResponseWithFallback(
    () => generateToolOgPng(tool.data.name, tool.data.summary, tool.data.tag),
    `tool:${tool.id}`,
  );
};
