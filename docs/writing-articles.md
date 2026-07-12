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

KaTeX rendering is enabled. Write LaTeX inside `$...$` for inline math or `$$...$$` on its own lines for display equations:

```mdx
The attention scale factor is $1/\sqrt{d_k}$.

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$
```

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

These are available in every post automatically — no import needed.

#### `<Figure>` — a captioned visual

Wrap any image, diagram, or inline SVG with a caption:

```mdx
<Figure caption="FlashAttention tiles attention to reduce HBM traffic.">
  <Image src={flash} alt="FlashAttention memory access pattern" />
</Figure>
```

**Sizing is optional.** By default a figure sits at a comfortable size, centered — small diagrams stay small and are not stretched to fill the page. If a visual deserves more room, set `width` and it grows, breaking out wider than the text column (capped so it never gets too wide to read on large screens):

```mdx
<Figure caption="A wide architecture diagram." width={900}>
  <Image src={arch} alt="..." />
</Figure>
```

`width` takes a number (pixels) or any CSS length (`"90%"`, `"48rem"`). Leave it off to use the default.

#### `<Gallery>` — several images in a row

Place multiple images side by side. They flow into as many columns as fit and wrap to the next row automatically on narrower screens — you don't lay anything out by hand:

```mdx
<Gallery>
  <Image src={a} alt="..." />
  <Image src={b} alt="..." />
  <Image src={c} alt="..." />
</Gallery>
```

`min` sets how small a cell may get before wrapping (default `240px`). Lower it to fit more per row:

```mdx
<Gallery min={160}>...</Gallery>
```

#### `<Video>` — an embedded video

Embed a YouTube video. It loads only when the reader clicks play (keeps the page fast and private — no YouTube scripts until then):

```mdx
<Video id="dQw4w9WgXcQ" caption="Kent Beck on the origins of TDD." />
```

`id` is the YouTube video ID — the part after `v=` in the URL (`youtube.com/watch?v=dQw4w9WgXcQ` → `dQw4w9WgXcQ`). `caption` is optional.

#### Separators

To break a long piece into sections with a visual divider, put `---` on its own line (blank line above and below). It renders as a centered `· · ·`:

```mdx
Some paragraph.

---

The next part.
```

#### `<Note>` — a callout

```mdx
<Note>A short aside the reader should not miss.</Note>
```

---

## 6b. Tables

A plain Markdown table just works and picks up the site's default style:

```mdx
| Input       | How it becomes numbers | Length |
| ----------- | ---------------------- | ------ |
| Temperature | already a number       | 1      |
| A word      | learned embedding      | ~768   |
```

**Formatting inside cells** is normal Markdown — **bold**, _italic_, `code`, and links all work with no extra effort:

```mdx
| **Temperature** | it's _already_ a number | `[28.4]` |
```

Color is not part of Markdown, but because this is MDX you can drop in a span when you truly need one. Use it sparingly, and never as the _only_ way you convey meaning (color-blind readers):

```mdx
| <span style="color: var(--accent)">Warning</span> | ... |
```

**Table designs.** Wrap a table in `<Table>` to change its look. Omit `variant` for the site default.

| variant          | look                                       |
| ---------------- | ------------------------------------------ |
| `rule` (default) | header underline + hairline row separators |
| `zebra`          | shaded alternating rows                    |
| `lined`          | full grid, every cell bordered             |
| `plain`          | header underline only, no row lines        |

```mdx
<Table variant="zebra">

| Model | Params         | VRAM (FP16) |
| ----- | -------------- | ----------- |
| 7B    | 7,000,000,000  | 14 GB       |
| 70B   | 70,000,000,000 | 140 GB      |

</Table>
```

Keep the blank lines around the Markdown table inside `<Table>` — MDX needs them to parse it as a table.

---

## 6c. Headings

Every heading automatically gets a small copy-link icon that appears when the reader hovers the heading; clicking it copies a direct link to that section. Just write headings normally — there is nothing to add.

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
