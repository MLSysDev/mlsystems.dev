import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { TOPIC_IDS } from '@/lib/data';

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
      authors: z.array(reference('authors')).min(1),
      date: z.coerce.date(),
      readMin: z.number().int().positive(),
      // Display name is derived from topicId via topicName(); kept optional for
      // backward compat with existing frontmatter but no longer rendered.
      topic: z.string().optional(),
      topicId: z.enum(TOPIC_IDS),
      tags: z.array(z.string()).optional(),
      updated: z.coerce.date().optional(),
      cover: z.union([image(), z.string().url()]).optional(),
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
      authors: z.array(reference('authors')).optional(),
      topics: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      repo: z.string().url().optional(),
      core: z.boolean().optional().default(false),
      featured: z.boolean().optional().default(false),
      draft: z.boolean().optional().default(false),
    }),
});

export const collections = { posts, authors, tools };
