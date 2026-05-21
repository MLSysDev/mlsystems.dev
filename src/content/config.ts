import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    authors: z.array(reference('authors')).min(1),
    date: z.coerce.date(),
    readMin: z.number().int().positive(),
    topic: z.string(),
    topicId: z.string(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    tag: z.enum(['Live', 'Beta', 'Experimental', 'Soon']),
    icon: z.string().optional(),
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
