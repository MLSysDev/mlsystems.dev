# Extending the site

How to grow mlsystems.dev as needs evolve — auth, paid courses, interactive learning, comments, search, newsletter.

The codebase is intentionally modular. Each feature plugs in without refactoring the rest.

---

## Authentication

Astro supports both static and SSR modes. To enable auth (signup, login, sessions):

1. **Add an SSR adapter:**

   ```bash
   npx astro add vercel
   # or: npx astro add node
   # or: npx astro add netlify
   # or: npx astro add cloudflare
   ```

2. **In `astro.config.mjs`**, change `output: 'static'` to `output: 'hybrid'`. Hybrid means _static by default, SSR opt-in per page_.

3. **Pick an auth library:**
   - **[Lucia](https://lucia-auth.com)** — framework-agnostic, simple, you own the session table
   - **[Auth.js](https://authjs.dev)** (formerly NextAuth) — supports many OAuth providers out of the box
   - **[Better Auth](https://better-auth.com)** — modern, type-safe, lightweight
   - **[Clerk](https://clerk.com)** — managed service, beautiful UI, has an Astro SDK
   - **[Supabase Auth](https://supabase.com/auth)** — pairs well with Supabase as your DB

4. **Mark dynamic pages as SSR:**

   ```astro
   ---
   export const prerender = false; // this page renders on every request
   ---
   ```

   Everything else stays static. Your blog pages don't lose any speed.

---

## Paid courses

1. **Add a `courses` collection** in `src/content/config.ts`:

   ```ts
   const courses = defineCollection({
     type: 'content',
     schema: z.object({
       title: z.string(),
       summary: z.string(),
       lessons: z.array(z.string()),
       price: z.number().optional(),
       // ... etc
     }),
   });
   ```

2. **Create `src/content/courses/`** and add course MDX files.

3. **Add a course route:** `src/pages/courses/[slug].astro`.

4. **Wire payments via Stripe Checkout** — entitlements stored in your DB.

5. **Gate course content behind auth:** check session in the page's frontmatter, redirect to login or show a preview.

---

## Interactive learning modules

1. **Build modules as React islands** in `src/components/learn/`.
2. **Hydrate with `client:visible`** so they don't block first paint.
3. **Persist progress** via API routes → DB (once auth is in place).

For inspiration, see how `Playground.tsx` is structured — it's a self-contained interactive React component that mounts on the playground page.

---

## Comments

Currently `Comments.tsx` is an in-memory placeholder. The easiest path to real comments:

### Option 1: Giscus (recommended)

[Giscus](https://giscus.app) uses GitHub Discussions as the backing store. Free, no DB, no backend, perfect for a dev audience.

1. Enable **Discussions** on your GitHub repo
2. Install the [Giscus app](https://github.com/apps/giscus) on the repo
3. Configure at [giscus.app](https://giscus.app) — get a script snippet
4. Replace `Comments.tsx` with a Giscus React wrapper, or drop the script directly into the article layout
5. Configure `term={postSlug}` so each post maps to its own thread

Comments live in your GitHub Discussions tab. You own the data forever. Moderation uses normal GitHub tools.

### Option 2: Build your own

Once auth is in place, you can build a custom comment system with API routes and a DB. More work, more control. Probably not worth it before you have real traffic.

---

## Newsletter

Pick a service and drop in their embed. No backend code needed:

- **[Buttondown](https://buttondown.email)** (recommended) — dev-first, RSS-to-email auto-sends new posts, free up to 100 subs
- **[Resend Audiences](https://resend.com)** — modern API, free 3,000 emails/month
- **[EmailOctopus](https://emailoctopus.com)** — cheap and simple, free 2,500 subs

Add the embed form to the homepage CTA and footer.

---

## Search

Add **[Pagefind](https://pagefind.app)** for a fully static, client-side search index:

1. `npm install pagefind`
2. Add Pagefind to your build script (it runs after `astro build`)
3. Drop the Pagefind UI component into a search page or modal

Pagefind builds the index at build time and ships a tiny WASM runtime to the browser. Zero infrastructure, sub-100ms search results, works offline.

---

## Real community threads

The `THREADS` array in `src/lib/data.ts` is hardcoded sample data. When you're ready for a real forum:

- **Self-host [Discourse](https://www.discourse.org)** — the industry standard for dev communities
- **[Linen.dev](https://linen.dev)** — Slack/Discord mirror with SEO, hosted
- **Just use GitHub Discussions** — already free, already integrated with Giscus

For each, iframe under `/community` or build a thin reader against the forum's API.

---

## Real article counts and stats

Currently the homepage shows aspirational numbers like "284 articles · 47 contributors." These are placeholders in `lib/data.ts`.

To wire to real counts:

```astro
---
import { getCollection } from 'astro:content';
const posts = await getCollection('posts', ({ data }) => !data.draft);
const articleCount = posts.length;
const contributorCount = new Set(posts.map((p) => p.data.authorHandle)).size;
---
```

Drop `articleCount` and `contributorCount` into the JSX where the placeholders currently live.

---

## Other ideas

- **Newsletter analytics** — track open rates via Buttondown's built-in dashboard
- **OG image generation** — auto-generate per-post OG cards with `@vercel/og` at build time
- **Reading progress bar** — small React island, `client:idle`
- **Dark mode toggle** — design tokens already include dark variants in `global.css`; add a toggle
- **Author pages** — promote `author` from a string to a content collection with bios, social links, post listings
- **Multiple authors per post** — schema change: `authors: z.array(z.string())`
- **Citation export** — "cite this article" button generating BibTeX / APA / etc.
- **Embedded notebooks** — Pyodide for in-browser Python, perfect for tokenizer/attention demos
