import { readdirSync } from 'node:fs';
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Topic ids come from the data files themselves, so post frontmatter is
// validated against whatever topics exist — no code change to add one.
const TOPIC_IDS = readdirSync(new URL('./topics', import.meta.url))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, '')) as [string, ...string[]];

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    bio: z.string().optional(),
    role: z.string().optional().default('contributor'),
    avatar: z.string().optional(),
    github: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    mastodon: z.string().optional(),
    bluesky: z.string().optional(),
    website: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      // Plain author handles, resolved defensively at render (see lib/posts.ts):
      // a missing profile falls back to Guest rather than failing the build.
      authors: z.array(z.string()).min(1),
      date: z.coerce.date(),
      readMin: z.number().int().positive(),
      // Display name is derived from topicId via topicName(); kept optional for
      // backward compat with existing frontmatter but no longer rendered.
      topic: z.string().optional(),
      // Optional: a post can belong to a topic hub, or stand alone. Missing topic
      // only removes it from /topics/<x> — it stays in /blog, search, tags, feeds.
      topicId: z.enum(TOPIC_IDS).optional(),
      // A writer-suggested topic not yet in TOPIC_IDS — surfaced for a maintainer
      // (or automation) to create the topic or remap topicId. Ignored by rendering.
      proposedTopic: z.string().optional(),
      tags: z.array(z.string()).optional(),
      updated: z.coerce.date().optional(),
      cover: z.union([image(), z.string().url()]).optional(),
      // Opt in to a generated 1200×630 share card (post title over the cover).
      // Only these posts render an OG card at build; everyone else uses the raw
      // cover or the shared default, keeping build time flat.
      ogCard: z.boolean().optional().default(false),
      featured: z.boolean().optional().default(false),
      draft: z.boolean().optional().default(false),
    }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/tools' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      summary: z.string(),
      tag: z.enum(['Live', 'Beta', 'Experimental', 'Soon']),
      icon: z.string().optional(),
      thumbnail: z.union([image(), z.string().url()]).optional(),
      authors: z.array(z.string()).optional(),
      topics: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      repo: z.string().url().optional(),
      core: z.boolean().optional().default(false),
      featured: z.boolean().optional().default(false),
      draft: z.boolean().optional().default(false),
    }),
});

const topics = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/topics' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    desc: z.string(),
  }),
});

const externalTools = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/external-tools' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    source: z.string(),
    desc: z.string(),
    href: z.string().url(),
    category: z.enum(['Tokenization', 'Memory & VRAM', 'Architecture', 'Training & Scaling']),
  }),
});

export const collections = { posts, authors, tools, topics, externalTools };
