// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://mlsystems.dev',
  trailingSlash: 'ignore',
  integrations: [
    react(),
    mdx({
      // remarkGfm is bundled in @astrojs/mdx by default — tables, strikethrough, etc work out of the box.
      remarkPlugins: [],
      rehypePlugins: [],
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
    }),
  ],

  // Static by default. When auth / courses ship, switch to:
  //   output: 'hybrid',
  //   adapter: vercel(),    // or node(), cloudflare(), netlify()
  output: 'static',

  build: {
    inlineStylesheets: 'auto',
  },
});
