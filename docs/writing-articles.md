# Writing an article

Posts on **mlsystems.dev** are MDX files in `src/content/posts/`. This document covers everything you need to write one — frontmatter, MDX components, images, and the publishing pipeline.

> Looking for the contribution _process_ (forking, branching, PR review)? See [CONTRIBUTING.md](../CONTRIBUTING.md). Adding yourself as an author? See [becoming-an-author.md](./becoming-an-author.md).

---

## 1. Create the file

```bash
touch src/content/posts/your-slug-here.mdx
```

The filename becomes the URL slug: `your-slug-here.mdx` → `mlsystems.dev/blog/your-slug-here`.

Keep slugs short, lowercase, hyphenated, and stable — once published, changing the slug breaks inbound links.

---

## 2. Add typed frontmatter

```mdx
---
id: '2026.12.001'
title: 'My new article'
summary: 'One-sentence pitch that shows up in the index and on social cards.'
authors: ['yourhandle'] # one or more handles from src/content/authors
date: '2026-12-01'
readMin: 12
topic: 'Inference & Serving'
topicId: 'inference'
tags: ['attention', 'kernels']
featured: true # surface on home page (optional)
draft: false # hide from /blog and sitemap (optional, default false)
---
```

**Validation:** All frontmatter is validated by Zod schemas in [`src/content/config.ts`](../src/content/config.ts). Missing required fields, bad types, unknown `topicId` values, or unknown author handles fail the build with a clear error. No manual review needed.

**Required fields:** `id`, `title`, `summary`, `authors`, `date`, `readMin`, `topic`, `topicId`.

**Optional fields:** `tags`, `featured` (default `false`), `draft` (default `false`).

### Multiple authors

`authors` is an array — list as many handles as needed. Each name renders as a clickable byline link to that author's profile page.

```mdx
authors: ['lchen', 'priya', 'naoko']
```

### Topic IDs

`topicId` must match one of the topics defined in [`src/lib/data.ts`](../src/lib/data.ts). Current values:

`inference`, `training`, `architecture`, `distributed`, `quantization`, `rag`, `multimodal`, `world-models`, `evals`, `mlops`.

`topic` is the human-readable display label, e.g. `'Inference & Serving'`.

---

## 3. Write the body

Standard Markdown works:

```mdx
**bold**, _italic_, [links](https://example.com), `inline code`,

> blockquotes,

## Headings

1. Numbered lists
2. Just like that.

- Bullets
- Also fine.
```

### Code blocks

Fenced code blocks get syntax highlighting via [Shiki](https://shiki.style) — the same engine VS Code uses. Always specify the language:

````mdx
```python
def attention(q, k, v):
    return softmax(q @ k.T / d**0.5) @ v
```
````

Supported languages include `python`, `cuda`, `cpp`, `rust`, `go`, `typescript`, `bash`, `yaml`, `json`, `diff`, and many more.

### Custom MDX components

These are available in any post — import is automatic.

**`<Figure>`** — for images and diagrams with captions:

```mdx
<Figure caption="A description of what the figure shows.">
  <img src="/path/to/image.png" alt="Required alt text" />
</Figure>
```

**`<Note>`** — for callouts and important caveats:

```mdx
<Note>Important caveat or pointer that breaks the flow.</Note>
```

### Math

Use LaTeX inside `$...$` (inline) or `$$...$$` (block). KaTeX rendering can be enabled — open an issue if you need it for a post.

---

## 4. Images

Two ways to include images, depending on what you need.

### Inline images (raw `<img>` or markdown)

Drop the file in `public/posts/<slug>/` and reference by absolute path:

```mdx
![Throughput vs batch size](/posts/your-slug-here/throughput.png)
```

These get `loading="lazy"` and `decoding="async"` automatically. **Always include alt text** — the build warns on missing alts.

### Optimized images (recommended for hero / large figures)

For images that need WebP conversion, responsive `srcset`, and dimension hints, use Astro's `<Image>` component. Place the source in `src/assets/posts/<slug>/` and import it:

```mdx
import { Image } from 'astro:assets';
import hero from '@/assets/posts/your-slug-here/hero.png';

<Image src={hero} alt="Required alt text" />
```

Astro generates WebP/AVIF, lazy-loads, and adds correct width/height to prevent layout shift.

---

## 5. Save and check locally

```bash
npm run dev
```

Visit `http://localhost:4321/blog/your-slug-here` to see your post rendered. The dev server hot-reloads on every save.

Before opening a PR, run a production build to catch schema errors:

```bash
npm run build
```

---

## What happens at publish time

Once your PR is merged, the build pipeline automatically:

- Generates a static page at `/blog/your-slug-here`
- Adds the post to `/blog` (archive) and `/topics/<topicId>`
- Adds the post to `/sitemap-index.xml`
- Adds the post to `/rss.xml`
- Indexes the post for full-text search (Pagefind)
- Generates a per-page Open Graph card, JSON-LD structured data, and canonical URL

No manual steps. Drop the MDX file in, open a PR, and you're published.

---

## Style guide

Specific guidance on tone, length, and quality lives in [CONTRIBUTING.md](../CONTRIBUTING.md#what-we-look-for-in-a-post). Short version: be specific, show your work, cite your claims, write for practitioners.
