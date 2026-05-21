// @ts-check
import { defineConfig } from 'astro/config';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const __dirname = dirname(fileURLToPath(import.meta.url));

const postLastmod = new Map();
try {
  const postsDir = join(__dirname, 'src/content/posts');
  for (const file of readdirSync(postsDir)) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
    try {
      const content = readFileSync(join(postsDir, file), 'utf8');
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const dateMatch = fm[1].match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m);
      const draftMatch = fm[1].match(/^draft:\s*(true|false)\s*$/m);
      if (draftMatch && draftMatch[1] === 'true') continue;
      if (dateMatch) {
        const slug = file.replace(/\.(mdx?|md)$/, '');
        postLastmod.set(`/blog/${slug}`, new Date(dateMatch[1]));
      }
    } catch (err) {
      console.warn(
        `[sitemap] could not read frontmatter for ${file}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
} catch (err) {
  if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
    console.warn('[sitemap] posts dir scan failed:', err.message);
  }
}

/** @type {string[]} */
const SKIP_PATTERNS = [];

/**
 * @param {string} path
 * @returns {number}
 */
function priorityFor(path) {
  if (path === '/' || path === '') return 1.0;
  if (path === '/blog' || path === '/topics') return 0.9;
  if (path === '/playground' || path === '/community' || path === '/contribute') return 0.8;
  if (path.startsWith('/blog/')) return 0.7;
  if (path.startsWith('/authors/')) return 0.6;
  return 0.5;
}

/**
 * @param {string} path
 * @returns {'daily' | 'weekly' | 'monthly'}
 */
function changefreqFor(path) {
  if (path === '/' || path === '/blog' || path === '/topics') return 'daily';
  if (path.startsWith('/blog/') || path.startsWith('/authors/')) return 'monthly';
  return 'weekly';
}

export default defineConfig({
  site: 'https://mlsystems.dev',
  trailingSlash: 'ignore',
  integrations: [
    react(),
    mdx({
      remarkPlugins: [],
      rehypePlugins: [],
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.5,
      filter: (page) => {
        try {
          const url = new URL(page);
          const p = url.pathname.replace(/\/$/, '') || '/';
          return !SKIP_PATTERNS.some((skip) => p === skip || p.startsWith(skip));
        } catch {
          return true;
        }
      },
      serialize(item) {
        try {
          const url = new URL(item.url);
          const path = url.pathname.replace(/\/$/, '') || '/';
          item.priority = priorityFor(path);
          // @ts-expect-error sitemap types use EnumChangefreq; the literal strings have matching values at runtime
          item.changefreq = changefreqFor(path);
          const realDate = postLastmod.get(path);
          item.lastmod = (realDate ?? new Date()).toISOString();
        } catch (err) {
          console.warn(
            `[sitemap] serialize failed for ${item.url}:`,
            err instanceof Error ? err.message : err,
          );
        }
        return item;
      },
    }),
  ],

  output: 'static',

  build: {
    inlineStylesheets: 'auto',
  },

  vite: {
    ssr: {
      external: ['@resvg/resvg-js', 'satori'],
    },
    optimizeDeps: {
      exclude: ['@resvg/resvg-js', 'satori'],
    },
    build: {
      rollupOptions: {
        external: [/^\/_pagefind\//],
      },
    },
  },
});
