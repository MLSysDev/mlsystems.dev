// Content collections — typed schemas for everything we publish.
// To add a new collection (e.g. courses, podcasts, talks), define another
// collection here and create a folder under src/content/.

import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    bio: z.string().optional(),
    role: z.string().optional().default('contributor'),
    github: z.string().optional(),
    twitter: z.string().optional(),
    website: z.string().optional(),
    avatar: z.string().optional(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    id: z.string().describe('arxiv-style ID, e.g. "2026.11.087"'),
    title: z.string(),
    summary: z.string().describe('one-sentence pitch — shows up in lists, meta description, OG card'),
    // Array of author handles (filenames in src/content/authors/). At least one required.
    authors: z.array(reference('authors')).min(1),
    date: z.coerce.date(),
    readMin: z.number().int().positive(),
    topic: z.string().describe('display name of topic, e.g. "Inference"'),
    topicId: z.string().describe('topic ID from src/lib/data.ts'),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
});

// Reserved for future expansion:
// const courses = defineCollection({ ... });
// const newsletters = defineCollection({ ... });

export const collections = { posts, authors };
