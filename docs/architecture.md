# Architecture

How the site is organized, and why each piece is where it is.

---

## Tech stack

- **[Astro 5](https://astro.build)** — content-first framework with islands architecture; ships ~0 KB JS on content pages
- **[MDX](https://mdxjs.com)** — Markdown with embedded interactive components, typed via Zod
- **[React 19](https://react.dev)** — used for interactive islands only (playgrounds, hero figures, comments)
- **[Shiki](https://shiki.style)** — VS Code-grade syntax highlighting
- **TypeScript strict mode** — fully typed across `.astro`, `.tsx`, `.ts`
- **No CSS framework** — pure CSS with custom properties, easy to fork

---

## File layout

```
mlsystems.dev/
├── astro.config.mjs               # Integrations: React, MDX, sitemap, RSS
├── tsconfig.json
├── package.json
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── docs/                          # ← you are here
└── src/
    ├── env.d.ts
    ├── content/
    │   ├── config.ts              # Zod schemas (typed frontmatter)
    │   └── posts/                 # Blog posts as .mdx files
    ├── pages/                     # File-based routing
    │   ├── index.astro            # /
    │   ├── 404.astro
    │   ├── rss.xml.ts             # /rss.xml
    │   ├── blog/
    │   │   ├── index.astro        # /blog
    │   │   └── [slug].astro       # /blog/<slug>
    │   ├── topics/index.astro     # /topics
    │   ├── community/index.astro  # /community
    │   ├── playground/index.astro # /playground
    │   └── contribute/index.astro # /contribute
    ├── layouts/
    │   └── BaseLayout.astro       # SEO, fonts, theme, nav/footer
    ├── components/
    │   ├── Nav.astro              # Static — zero JS
    │   ├── Footer.astro           # Static — zero JS
    │   ├── BlogFilter.astro       # Static chips + ~700B enhancement
    │   ├── HeroFigure.tsx         # React island (client:load)
    │   ├── Playground.tsx         # React island (client:visible)
    │   ├── SettingsDrawer.tsx     # React island (client:load)
    │   ├── Comments.tsx           # React island (client:visible)
    │   ├── ArticleActions.tsx     # React island (client:visible)
    │   ├── CommunityList.tsx      # React island (client:visible)
    │   ├── ToolGlyph.tsx          # Static React (no client directive)
    │   └── MDXComponents.tsx      # Custom <Figure>, <Note>, etc.
    ├── lib/
    │   ├── site.ts                # Site-wide constants — edit before launch
    │   └── data.ts                # Topics, threads, tools + helpers
    └── styles/
        └── global.css             # Design tokens + all CSS
```

---

## Design principles

### Static by default, interactive where it matters

- `.astro` files are server-rendered → **zero JS** shipped to the browser.
- `.tsx` files only ship JS when they have a `client:*` directive at the usage site (e.g., `<Playground client:visible />`).
- Each post page ships ~0 KB JS unless it embeds an interactive component.

### File-based routing

Every file under `src/pages/` becomes a URL. To add `/auth/login`, drop `pages/auth/login.astro`. To add `/courses/[id]`, drop `pages/courses/[id].astro`. No router config.

### Typed content collections

`src/content/config.ts` defines Zod schemas for every content type. Adding a new collection (e.g., `courses/`, `authors/`) is a few lines of schema + a folder. The rest of the app stays untouched.

### Separation of concerns in `lib/`

- `lib/site.ts` — global site constants (URLs, social handles, branding). Edit before launch.
- `lib/data.ts` — static taxonomy data (topics, sample threads). Will be replaced as features wire to real backends.
- Future: `lib/auth.ts`, `lib/db.ts`, `lib/payments.ts` when those features land.

### Components: `.astro` vs `.tsx`

| `.astro` (server-rendered)           | `.tsx` (React island)                             |
| ------------------------------------ | ------------------------------------------------- |
| Static UI: nav, footer, cards, lists | Interactive UI: playgrounds, drawers, comments    |
| Zero JS at runtime                   | Only ships JS when used with `client:*` directive |
| Faster build, smaller pages          | Use only when interactivity is required           |

Default to `.astro` unless you need state, effects, or event handlers.

---

## How interactivity gets added

To embed an interactive component in any post or page:

```astro
---
import Playground from '@/components/Playground.tsx';
---

<Playground client:visible />
```

The `client:visible` directive tells Astro to hydrate the component only when it scrolls into view — meaning a 5,000-word post with one playground at the bottom doesn't pay any JS cost until the reader scrolls there.

Available client directives:

- `client:load` — hydrate immediately on page load (use sparingly)
- `client:idle` — hydrate when the browser is idle
- `client:visible` — hydrate when scrolled into view (recommended for most islands)
- `client:media="(min-width: 768px)"` — only on matching viewport

---

## Adding new features later

This codebase is intentionally **modular**. Each future feature plugs in cleanly without refactoring:

- **Auth** → switch `output: 'static'` to `'hybrid'`, add an adapter, mark dynamic pages `prerender = false`. See [docs/extending.md](./extending.md#authentication).
- **Courses** → new content collection + new page route. See [docs/extending.md](./extending.md#paid-courses).
- **Search** → add Pagefind. Build-time static index, fully client-side.
- **Comments** → swap `Comments.tsx` for a Giscus embed. See [docs/extending.md](./extending.md#comments).
- **Newsletter** → drop a Buttondown form embed. No backend needed.

See [docs/extending.md](./extending.md) for the full guide on growing the site.
