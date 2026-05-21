# Writing an article

Posts on **mlsystems.dev** are MDX files in `src/content/posts/`. This document covers everything you need to write one — frontmatter, MDX components, and the publishing pipeline.

> Looking for the contribution *process* (forking, branching, PR review)? See [CONTRIBUTING.md](../CONTRIBUTING.md). This doc covers the *how-to-write* part.

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
id: "2026.12.001"
title: "My new article"
summary: "One-sentence pitch that shows up in the index and on social cards."
author: "Your Name"
authorHandle: "yourhandle"
date: "2026-12-01"
readMin: 12
topic: "Inference"
topicId: "inference"
tags: ["attention", "kernels"]
featured: true     # surface on home page
draft: false       # set true to hide from /blog and sitemap
---
```

**Validation:** All frontmatter is validated by Zod schemas in [`src/content/config.ts`](../src/content/config.ts). Missing required fields, bad types, or unknown `topicId` values fail the build with a clear error. This keeps the site consistent without manual review.

**Required fields:** `id`, `title`, `summary`, `author`, `date`, `readMin`, `topic`, `topicId`, `tags`.

**Optional fields:** `authorHandle`, `featured` (default false), `draft` (default false), `cover` (path to a cover image).

---

## 3. Write the body

Standard Markdown works:

```mdx
**bold**, *italic*, [links](https://example.com), `inline code`,
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
  <img src="/path/to/image.png" alt="..." />
</Figure>
```

**`<Note>`** — for callouts and important caveats:

```mdx
<Note>
  Important caveat or pointer that breaks the flow.
</Note>
```

### Math

If your post needs equations, use LaTeX inside `$...$` (inline) or `$$...$$` (block). KaTeX rendering can be enabled — open an issue if you need it for a post.

---

## 4. Add yourself as an author

If this is your first post, add an entry to `src/content/authors/` (coming soon — for now, just include `author` + `authorHandle` in your frontmatter).

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
- Generates per-page Open Graph card, JSON-LD structured data, and canonical URL

No manual steps. Drop the MDX file in, open a PR, and you're published.

---

## Style guide

Specific guidance on tone, length, and quality lives in [CONTRIBUTING.md](../CONTRIBUTING.md#what-we-look-for-in-a-post). Short version: be specific, show your work, cite your claims, write for practitioners.
