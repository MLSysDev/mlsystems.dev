import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tagSlug } from './data';

const OWNER = 'MLSysDev';
const NAME = 'mlsystems.dev';

// GitHub serves user-uploaded images behind short-lived signed URLs
// (private-user-images.githubusercontent.com, ~5 min JWT), so an embedded <img>
// is dead by the time a reader loads the static page. At build (while the URL is
// live) we download each one into public/forum-media/ and rewrite the src to a
// stable local path. Id-keyed filename → already-downloaded media is skipped.
const MEDIA_DIR = 'public/forum-media';

function mediaFileName(url: string): string {
  const base = (url.split('?')[0].split('/').pop() || '').replace(/[^a-zA-Z0-9._-]/g, '');
  return /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base || 'img'}.png`;
}

async function rehostMedia(html: string): Promise<string> {
  const urls = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => /\.githubusercontent\.com\//.test(u));
  if (urls.length === 0) return html;
  mkdirSync(MEDIA_DIR, { recursive: true });
  let out = html;
  for (const url of [...new Set(urls)]) {
    try {
      const name = mediaFileName(url);
      const path = join(MEDIA_DIR, name);
      if (!existsSync(path)) {
        const r = await fetch(url);
        if (!r.ok) continue;
        writeFileSync(path, Buffer.from(await r.arrayBuffer()));
      }
      out = out.split(url).join(`/forum-media/${name}`);
    } catch {
      // leave the original src on any failure — worst case is one broken image,
      // never a broken build.
    }
  }
  return out;
}

const EXCLUDED_CATEGORY_SLUGS = new Set(['comments']);

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

export type ForumPoll = {
  question: string;
  totalVoteCount: number;
  options: { option: string; votes: number }[];
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
  poll: ForumPoll | null;
};

export type Forum = { categories: ForumCategory[]; threads: ForumThread[] };

function token(): string | undefined {
  return (
    import.meta.env.GITHUB_TOKEN ||
    import.meta.env.GH_TOKEN ||
    (typeof process !== 'undefined'
      ? process.env?.GITHUB_TOKEN || process.env?.GH_TOKEN
      : undefined)
  );
}

function emojiFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

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
        category{ name slug emojiHTML isAnswerable }
        author{ login url avatarUrl }
        poll{ question totalVoteCount options(first:10){ nodes{ option totalVoteCount } } }
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

type RawCategory = { name: string; slug: string; emojiHTML: string; isAnswerable: boolean };

type RawPoll = {
  question: string;
  totalVoteCount: number;
  options: { nodes: { option: string; totalVoteCount: number }[] };
} | null;

type RawDiscussion = {
  number: number;
  title: string;
  bodyHTML: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  upvoteCount: number;
  category: RawCategory | null;
  author: ForumAuthor | null;
  poll: RawPoll;
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
    .map((d) => {
      const c = d.category as RawCategory;
      return {
        number: d.number,
        title: d.title,
        slug: threadSlug(d.number, d.title),
        bodyHTML: d.bodyHTML,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        url: d.url,
        upvoteCount: d.upvoteCount,
        category: {
          name: c.name,
          slug: c.slug,
          emoji: emojiFromHtml(c.emojiHTML),
          isAnswerable: c.isAnswerable,
        },
        author: d.author,
        commentCount: d.comments.totalCount,
        comments: d.comments.nodes.map(shapeComment),
        poll: d.poll
          ? {
              question: d.poll.question,
              totalVoteCount: d.poll.totalVoteCount,
              options: d.poll.options.nodes.map((o) => ({
                option: o.option,
                votes: o.totalVoteCount,
              })),
            }
          : null,
      };
    });

  const rehostComment = async (c: ForumComment): Promise<void> => {
    c.bodyHTML = await rehostMedia(c.bodyHTML);
    for (const r of c.replies ?? []) await rehostComment(r);
  };
  for (const t of threads) {
    t.bodyHTML = await rehostMedia(t.bodyHTML);
    for (const c of t.comments) await rehostComment(c);
  }

  const bySlug = new Map<string, ForumCategory>();
  for (const t of threads) bySlug.set(t.category.slug, t.category);
  const categories = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));

  cache = { categories, threads };
  return cache;
}

export function threadsByCategory(threads: ForumThread[], slug: string): ForumThread[] {
  return threads.filter((t) => t.category.slug === slug);
}
