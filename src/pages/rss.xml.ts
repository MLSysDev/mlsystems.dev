import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE } from '@/lib/site';
import { sortPostsByDate } from '@/lib/data';
import { topicName } from '@/lib/topics';
import { authorNames, resolvePostAuthors } from '@/lib/posts';

export async function GET(context: APIContext) {
  const postsRaw = (await getCollection('posts', ({ data }) => !data.draft)).sort(sortPostsByDate);
  const posts = await resolvePostAuthors(postsRaw);

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.date,
      link: `/blog/${p.id}`,
      author: authorNames(p),
      categories: [topicName(p.data.topicId), ...(p.data.tags ?? [])].filter(Boolean),
      customData: `<author>${escapeXml(authorNames(p))}</author>`,
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
