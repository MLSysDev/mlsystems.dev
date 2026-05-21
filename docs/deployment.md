# Deployment

The site is static by default — it builds to plain HTML/CSS/JS in `dist/` and can be hosted anywhere.

When you add auth or other server-rendered features, you'll need an SSR adapter. See [docs/extending.md](./extending.md#authentication) for that.

---

## Vercel (recommended)

1. Push your branch to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Astro — no configuration needed.
4. Click **Deploy**.
5. Add your domain under **Settings → Domains**.

Pull request preview deploys are enabled by default. Every PR gets a unique URL you can share for review.

---

## Cloudflare Pages

1. Push to GitHub.
2. In the Cloudflare dashboard: **Pages → Create a project → Connect to Git**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy**.
5. Add your domain under **Custom domains**.

Cloudflare's free tier is generous and edge-cached worldwide. Good choice if you want zero per-request cost.

---

## Netlify

1. Push to GitHub.
2. In the Netlify dashboard: **Add new site → Import from Git**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy**.

---

## Any static host

```bash
npm run build
```

Upload the contents of `dist/` to any static host — S3 + CloudFront, GitHub Pages, your own server, anywhere that serves files.

---

## Pre-launch checklist

Before pointing your domain at the deploy, work through:

- [ ] Edit `src/lib/site.ts` — set `url`, `twitter`, `github`, `pitchEmail` to real values
- [ ] Add a real `og-default.png` (1200×630) to `public/`
- [ ] Verify the site in [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Submit `https://mlsystems.dev/sitemap-index.xml` to Search Console
- [ ] See [docs/seo.md](./seo.md) for the full SEO checklist
- [ ] Test the site on mobile and desktop
- [ ] Check the build is clean: `npm run build` should complete with zero errors
