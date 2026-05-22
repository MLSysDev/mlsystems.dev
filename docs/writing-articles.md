# Writing an article

Posts on **mlsystems.dev** live in `src/content/posts/`. Each post is a folder containing an `index.mdx` plus any images, components, or data that belong with it.

> Looking for the contribution _process_ (forking, branching, PR review)? See [CONTRIBUTING.md](../CONTRIBUTING.md). Adding yourself as an author? See [becoming-an-author.md](./becoming-an-author.md).

---

## 1. Create the folder

```bash
mkdir src/content/posts/your-slug-here
touch src/content/posts/your-slug-here/index.mdx
```

The folder name becomes the URL slug: `your-slug-here/` → `mlsystems.dev/blog/your-slug-here`.

Keep slugs short, lowercase, hyphenated, and stable — once published, changing the slug breaks inbound links.

### Why a folder?

Everything related to one article lives together:

```
src/content/posts/your-slug-here/
├── index.mdx          ← the article
├── hero.png           ← optional cover image (used as OG card)
├── benchmark.png      ← inline image used in the body
├── ThroughputViz.tsx  ← optional custom React component just for this post
└── data.json          ← optional data used by that component
```

Delete the folder → everything for that post goes with it. No orphan images, no leftover components.

---

## 2. Add typed frontmatter

```mdx
---
title: 'My new article'
summary: 'One-sentence pitch that shows up in the index and on social cards.'
authors: ['yourhandle'] # one or more handles from src/content/authors
date: '2026-12-01'
readMin: 12
topic: 'Inference & Serving'
topicId: 'inference'
tags: ['attention', 'kernels']
cover: './hero.png' # optional — see "Cover image" below
featured: true # surface on home page (optional, default false)
draft: false # hide from /blog and sitemap (optional, default false)
---
```

**Validation:** all frontmatter is validated by Zod schemas in [`src/content/config.ts`](../src/content/config.ts). Missing fields, bad types, unknown `topicId` values, or unknown author handles fail the build with a clear error.

**Required:** `title`, `summary`, `authors`, `date`, `readMin`, `topic`, `topicId`.

**Optional:** `tags`, `cover`, `featured`, `draft`.

### Multiple authors

`authors` is an array — list as many handles as needed. Each renders as a clickable byline link.

```yaml
authors: ['lchen', 'priya', 'naoko']
```

### Topic IDs

`topicId` must match one of the topics defined in [`src/lib/data.ts`](../src/lib/data.ts). Current values: `inference`, `training`, `architecture`, `distributed`, `quantization`, `rag`, `multimodal`, `agents`, `evals`, `mlops`. `topic` is the human-readable label.

---

## 3. Cover image (social card)

By default every post gets an auto-generated Open Graph card with your title, authors, and the site's brand bar. If you want a custom cover instead — your own diagram, a paper figure, a chart — add a `cover` field.

### Local file (recommended)

Drop the image in your post folder and reference it relatively:

```yaml
cover: './hero.png'
```

Astro will:

- Validate the file exists at build time (broken paths fail the build, not production)
- Generate WebP / AVIF + responsive `srcset` automatically
- Add a content-hash to the filename for permanent CDN caching
- Use it as `og:image` and `twitter:image` — your social shares show this instead of the generated card

### Remote URL (Cloudinary, S3, anywhere)

For images already hosted on a CDN:

```yaml
cover: 'https://res.cloudinary.com/yourname/image/upload/v1/hero.jpg'
```

The URL is used as-is. No build-time optimization (the CDN should handle that), but no orphan risk either.

### How `cover` skips OG generation

When `cover` is set, the build skips Satori OG card generation for that post — your image is the OG card. At scale (hundreds of posts), this saves real build time.

---

## 4. Write the body

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

Fenced code blocks get syntax highlighting via [Shiki](https://shiki.style). Always specify the language:

````mdx
```python
def attention(q, k, v):
    return softmax(q @ k.T / d**0.5) @ v
```
````

Supported: `python`, `cuda`, `cpp`, `rust`, `go`, `typescript`, `bash`, `yaml`, `json`, `diff`, and many more.

---

## 5. Inline images

For images inside the article body, **always use `<Image>` from `astro:assets`** — not plain markdown image syntax. This gives you WebP/AVIF, lazy loading, and proper width/height to prevent layout shift.

```mdx
import { Image } from 'astro:assets';
import flash from './flash-attention.png';

<Image src={flash} alt="FlashAttention memory access pattern" />
```

Wrap with a caption using the `<Figure>` component:

```mdx
<Figure caption="FlashAttention tiles attention to reduce HBM traffic.">
  <Image src={flash} alt="FlashAttention memory access pattern" />
</Figure>
```

Every image needs **alt text** — the build warns if it's missing.

### Math

LaTeX inside `$...$` (inline) or `$$...$$` (block). KaTeX rendering can be enabled — open an issue if you need it.

---

## 6. Custom MDX components (per-post)

One of the strongest reasons to use the folder pattern: each article can ship its own interactive components, scoped to that post.

```
src/content/posts/your-slug-here/
├── index.mdx
├── ThroughputViz.tsx   ← lives only with this post
└── data.json
```

`ThroughputViz.tsx`:

```tsx
import data from './data.json';

export default function ThroughputViz() {
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

`index.mdx`:

```mdx
import ThroughputViz from './ThroughputViz';

<ThroughputViz client:visible />
```

Astro hydration directives (`client:load`, `client:visible`, `client:idle`) all work normally. Only the components actually imported get bundled.

This keeps `src/components/` clean — global components stay site-wide, one-off post visualizations live with their post and get deleted when the post does.

### Built-in MDX components

Available in any post — import is automatic:

- **`<Figure caption="...">`** — image + caption wrapper
- **`<Note>`** — callout box

---

## 7. Save and check locally

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
- Adds the post to `/blog` (archive) and the topic pages
- Adds it to `/sitemap-index.xml` and `/rss.xml`
- Indexes the post for full-text search (Pagefind)
- Generates a custom OG card (or uses your `cover` if set), JSON-LD structured data, canonical URL

No manual steps. Drop the folder in, open a PR, you're published.

---

## Style guide

Specific guidance on tone, length, and quality lives in [CONTRIBUTING.md](../CONTRIBUTING.md#what-we-look-for-in-a-post). Short version: be specific, show your work, cite your claims, write for practitioners.
