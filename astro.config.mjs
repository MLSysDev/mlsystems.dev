// @ts-check
import { defineConfig } from 'astro/config';
import { readdirSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache-buster for social scrapers (Slack/LinkedIn cache og:image by URL):
// hashing the card template means the URL changes exactly when the design does.
const ogVersion = createHash('md5')
  .update(readFileSync(join(__dirname, 'src/lib/og.tsx'), 'utf8'))
  .digest('hex')
  .slice(0, 8);

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
      const updatedMatch = fm[1].match(/^updated:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m);
      const draftMatch = fm[1].match(/^draft:\s*(true|false)\s*$/m);
      if (draftMatch && draftMatch[1] === 'true') continue;
      const stamp = updatedMatch?.[1] ?? dateMatch?.[1];
      if (stamp) {
        const slug = file.replace(/\.(mdx?|md)$/, '');
        postLastmod.set(`/blog/${slug}`, new Date(stamp));
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
const SKIP_PATTERNS = ['/write', '/search'];

// Paginated listing pages (/blog/2, /topics/x/2, /tags/x/2, /authors/x/articles/2)
// are secondary — keep them below their first page and below real articles.
/**
 * @param {string} path
 * @returns {boolean}
 */
function isPaginatedListing(path) {
  return /\/\d+$/.test(path);
}

/**
 * @param {string} path
 * @returns {number}
 */
function priorityFor(path) {
  if (path === '/' || path === '') return 1.0;
  if (path === '/blog' || path === '/topics') return 0.9;
  if (path === '/playground' || path === '/community' || path === '/contribute' || path === '/why')
    return 0.8;
  if (isPaginatedListing(path)) return 0.4;
  if (path.startsWith('/blog/')) return 0.7;
  if (path.startsWith('/topics/') || path.startsWith('/tags/')) return 0.6;
  if (path.startsWith('/authors/')) return 0.6;
  return 0.5;
}

/**
 * @param {string} path
 * @returns {'daily' | 'weekly' | 'monthly'}
 */
function changefreqFor(path) {
  if (path === '/' || path === '/blog' || path === '/topics') return 'daily';
  if (isPaginatedListing(path)) return 'weekly';
  if (path.startsWith('/blog/') || path.startsWith('/authors/')) return 'monthly';
  return 'weekly';
}

export default defineConfig({
  site: 'https://mlsystems.dev',
  trailingSlash: 'never',
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
  integrations: [
    react(),
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: { className: ['heading-anchor'], ariaLabel: 'Copy link to section' },
            content: {
              type: 'element',
              tagName: 'svg',
              properties: {
                width: 16,
                height: 16,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'aria-hidden': 'true',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'path',
                  properties: { d: 'M9 17H7A5 5 0 0 1 7 7h2' },
                  children: [],
                },
                {
                  type: 'element',
                  tagName: 'path',
                  properties: { d: 'M15 7h2a5 5 0 0 1 0 10h-2' },
                  children: [],
                },
                {
                  type: 'element',
                  tagName: 'line',
                  properties: { x1: 8, y1: 12, x2: 16, y2: 12 },
                  children: [],
                },
              ],
            },
          },
        ],
        rehypeKatex,
      ],
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
    // 'auto' inlines only small styles; the shared design-system sheet is emitted
    // as one cacheable /_astro/*.css instead of being duplicated into every page.
    inlineStylesheets: 'auto',
    // Flat files (blog/x.html) instead of blog/x/index.html, so URLs stay clean
    // with no trailing slash (pairs with trailingSlash: 'never'). Avoids
    // Cloudflare's directory-style 308 redirect that appended the slash.
    format: 'file',
  },

  vite: {
    define: {
      __OG_VERSION__: JSON.stringify(ogVersion),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      external: ['@resvg/resvg-js', 'satori'],
    },
    optimizeDeps: {
      exclude: ['@resvg/resvg-js', 'satori'],
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@blocknote/core',
        '@blocknote/react',
        '@blocknote/mantine',
        '@blocknote/code-block',
      ],
    },
    build: {
      rollupOptions: {
        external: [/^\/_pagefind\//],
      },
    },
  },
});
