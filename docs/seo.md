# SEO

Search engines love mlsystems.dev because every page is pure static HTML with no client-side rendering tax. Here's what's already wired in, and what to do before launch.

---

## What's already done

- ✅ **Per-page `<title>` and `<meta description>`** — populated from frontmatter
- ✅ **Open Graph + Twitter cards** on every page
- ✅ **Canonical URLs** — prevents duplicate-content penalties
- ✅ **JSON-LD structured data** on article pages — helps Google Rich Results
- ✅ **Auto-generated `/sitemap-index.xml`** via `@astrojs/sitemap`
- ✅ **Static `/robots.txt`** at `public/robots.txt`
- ✅ **RSS feed at `/rss.xml`** for readers and newsletter pipelines
- ✅ **Semantic HTML** — proper heading hierarchy, `<article>`, `<nav>`, `<main>`
- ✅ **Pure static HTML** on every page — best possible crawlability
- ✅ **Self-hosted Google Fonts** via `preconnect`
- ✅ **Trailing slash policy** set to `ignore` for clean URLs

---

## Pre-launch checklist

Before publicly launching, work through these:

### 1. Edit `src/lib/site.ts`

Set real values for:

```ts
url: 'https://mlsystems.dev',          // your live URL
description: 'Your real description',   // 150-160 chars, used in meta + OG
twitter: '@yourhandle',                 // or null if you don't have one yet
github: 'https://github.com/MLSysDev',
pitchEmail: 'real@email.address',
```

### 2. Add a default OG image

Drop a 1200×630 PNG at `public/og-default.png`. This is what shows on Twitter, LinkedIn, Slack, Discord, etc. when someone shares your homepage.

Per-post OG images are auto-generated from the post's frontmatter.

### 3. Verify the site in search consoles

- **[Google Search Console](https://search.google.com/search-console)** — claim the domain via DNS TXT record or HTML file
- **[Bing Webmaster Tools](https://www.bing.com/webmasters)** — same idea, smaller traffic share but still worth it

### 4. Submit your sitemap

In Search Console: **Sitemaps → Add a new sitemap → `sitemap-index.xml`**.

Bing Webmaster Tools has the same flow.

### 5. Set up analytics

Recommended: **[Plausible](https://plausible.io)** or **[Umami](https://umami.is)** — privacy-friendly, lightweight, no cookie banners needed. Avoid Google Analytics (slow, requires cookie consent, ML/dev audiences increasingly block it).

Drop the analytics script into `BaseLayout.astro`.

### 6. Confirm robots.txt

Open `public/robots.txt` and confirm:

```
User-agent: *
Allow: /

Sitemap: https://mlsystems.dev/sitemap-index.xml
```

If you want to block AI crawlers (e.g., GPTBot, ClaudeBot, CCBot), add `Disallow` rules here. This is a personal/editorial choice.

### 7. Test on real devices

Run [PageSpeed Insights](https://pagespeed.web.dev/) against your live site. Aim for 95+ on every metric. The current build should easily hit it.

---

## Ongoing SEO practices

### Writing posts that rank

- **Title:** include the key term in the first 60 chars
- **Summary:** 150-160 chars, descriptive, includes the key term
- **First paragraph:** state what the post covers and who it's for
- **Headings:** use them, hierarchically (H2 → H3), and include keywords naturally
- **Internal links:** link related posts in your sentences, not just at the bottom
- **External citations:** link papers, repos, and prior art — Google rewards real references

### Keeping the site fast

- Don't add heavy JS libraries to `.astro` pages
- Keep images optimized (Astro's image integration handles this automatically when you `import` images)
- Use `client:visible` for islands so they hydrate lazily, not on page load

### Avoiding dark patterns

- No keyword stuffing
- No invisible text
- No misleading titles vs. content
- No clickbait that the post doesn't deliver on

Search engines have gotten good at detecting these. Don't bother.
