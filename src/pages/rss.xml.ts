import rss from '@astrojs/rss';
import { getCollection, getEntries } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE } from '@/lib/site';
import { sortPostsByDate } from '@/lib/data';

export async function GET(context: APIContext) {
  const postsRaw = (await getCollection('posts', ({ data }) => !data.draft)).sort(sortPostsByDate);

  const posts = await Promise.all(
    postsRaw.map(async (p) => ({
      ...p,
      authorNames: (await getEntries(p.data.authors)).map((a) => a.data.name).join(', '),
    })),
  );

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.date,
      link: `/blog/${p.id}/`,
      author: p.authorNames,
      categories: [p.data.topic, ...(p.data.tags ?? [])],
      customData: `<author>${escapeXml(p.authorNames)}</author>`,
    })),
    customData: `<language>en-us</language>`,
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
