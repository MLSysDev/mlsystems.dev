// Server-only: mirrors GitHub Discussions into forum data at build time.
// All writing happens on GitHub; this module is read-only. Never import it into
// client-bundled code — it uses a build-time token. Fetch is fully defensive:
// no token, a failed request, or Discussions being empty all yield an empty
// forum (with a warning) rather than a broken build.

import { tagSlug } from './data';

const OWNER = 'MLSysDev';
const NAME = 'mlsystems.dev';

// giscus stores per-post blog comments in this category — never a forum thread.
const EXCLUDED_CATEGORY_SLUGS = new Set(['comments']);

// Cap rendered comments per thread; commentCount still reports the true total to
// readers and to search engines, with a "continue on GitHub" link for the rest.
export const COMMENT_RENDER_CAP = 50;

export type ForumAuthor = { login: string; url: string; avatarUrl: string };

export type ForumCategory = {
  name: string;
  slug: string;
  emoji: string;
  isAnswerable: boolean;
};

export type ForumComment = {
  id: string;
  author: ForumAuthor | null;
  bodyHTML: string;
  createdAt: string;
  url: string;
  isAnswer: boolean;
  replies: ForumComment[];
};

export type ForumThread = {
  number: number;
  title: string;
  slug: string;
  bodyHTML: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  upvoteCount: number;
  category: ForumCategory;
  author: ForumAuthor | null;
  commentCount: number;
  comments: ForumComment[];
};

export type Forum = { categories: ForumCategory[]; threads: ForumThread[] };

function token(): string | undefined {
  // Cloudflare Pages / CI expose the token as an env var at build time.
  return (
    import.meta.env.GITHUB_TOKEN ||
    import.meta.env.GH_TOKEN ||
    (typeof process !== 'undefined'
      ? process.env?.GITHUB_TOKEN || process.env?.GH_TOKEN
      : undefined)
  );
}

// One discussion slug = number + title, so it never collides with a page number
// and stays stable if the title is later edited (the number anchors it).
export function threadSlug(number: number, title: string): string {
  const s = tagSlug(title)
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return s ? `${number}-${s}` : `${number}`;
}

const DISCUSSIONS_QUERY = `
query($owner:String!,$name:String!,$after:String){
  repository(owner:$owner,name:$name){
    discussions(first:25, after:$after, orderBy:{field:UPDATED_AT, direction:DESC}){
      pageInfo{ hasNextPage endCursor }
      nodes{
        number title bodyHTML createdAt updatedAt url upvoteCount
        category{ name slug emoji isAnswerable }
        author{ login url avatarUrl }
        comments(first:${COMMENT_RENDER_CAP}){
          totalCount
          nodes{
            id bodyHTML createdAt url isAnswer
            author{ login url avatarUrl }
            replies(first:20){
              nodes{ id bodyHTML createdAt url author{ login url avatarUrl } }
            }
          }
        }
      }
    }
  }
}`;

type RawComment = {
  id: string;
  bodyHTML: string;
  createdAt: string;
  url: string;
  isAnswer?: boolean;
  author: ForumAuthor | null;
  replies?: { nodes: RawComment[] };
};

type RawDiscussion = {
  number: number;
  title: string;
  bodyHTML: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  upvoteCount: number;
  category: ForumCategory | null;
  author: ForumAuthor | null;
  comments: { totalCount: number; nodes: RawComment[] };
};

function shapeComment(c: RawComment): ForumComment {
  return {
    id: c.id,
    author: c.author,
    bodyHTML: c.bodyHTML,
    createdAt: c.createdAt,
    url: c.url,
    isAnswer: Boolean(c.isAnswer),
    replies: (c.replies?.nodes ?? []).map(shapeComment),
  };
}

async function fetchAll(gh: string): Promise<RawDiscussion[]> {
  const out: RawDiscussion[] = [];
  let after: string | null = null;
  // Bound the loop so a surprise of thousands of threads can't stall a build.
  for (let page = 0; page < 40; page++) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${gh}`,
        'content-type': 'application/json',
        'user-agent': 'mlsystems-forum-build',
      },
      body: JSON.stringify({
        query: DISCUSSIONS_QUERY,
        variables: { owner: OWNER, name: NAME, after },
      }),
    });
    if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
    const json = (await res.json()) as {
      errors?: { message: string }[];
      data?: {
        repository?: {
          discussions: {
            pageInfo: { hasNextPage: boolean; endCursor: string };
            nodes: RawDiscussion[];
          };
        };
      };
    };
    if (json.errors?.length) throw new Error(json.errors[0].message);
    const conn = json.data?.repository?.discussions;
    if (!conn) break;
    out.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return out;
}

let cache: Forum | null = null;

export async function getForum(): Promise<Forum> {
  if (cache) return cache;
  const gh = token();
  if (!gh) {
    console.warn('[forum] no GITHUB_TOKEN — forum renders empty. Set it in the build env.');
    cache = { categories: [], threads: [] };
    return cache;
  }
  let raw: RawDiscussion[];
  try {
    raw = await fetchAll(gh);
  } catch (err) {
    console.warn(
      `[forum] fetch failed (${err instanceof Error ? err.message : err}) — empty forum.`,
    );
    cache = { categories: [], threads: [] };
    return cache;
  }

  const threads: ForumThread[] = raw
    .filter((d) => d.category && !EXCLUDED_CATEGORY_SLUGS.has(d.category.slug))
    .map((d) => ({
      number: d.number,
      title: d.title,
      slug: threadSlug(d.number, d.title),
      bodyHTML: d.bodyHTML,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      url: d.url,
      upvoteCount: d.upvoteCount,
      category: d.category as ForumCategory,
      author: d.author,
      commentCount: d.comments.totalCount,
      comments: d.comments.nodes.map(shapeComment),
    }));

  // Only surface categories that actually contain forum threads.
  const bySlug = new Map<string, ForumCategory>();
  for (const t of threads) bySlug.set(t.category.slug, t.category);
  const categories = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));

  cache = { categories, threads };
  return cache;
}

export function threadsByCategory(threads: ForumThread[], slug: string): ForumThread[] {
  return threads.filter((t) => t.category.slug === slug);
}
