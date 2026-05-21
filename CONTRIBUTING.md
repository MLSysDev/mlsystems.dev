# Contributing to mlsystems.dev

Welcome! This site is built openly, and every blog post here is the work of a contributor — possibly you next.

There are three main ways to contribute:

1. **Write a blog post** — share something you learned, built, or debugged.
2. **Suggest a topic** — propose something you want to read but don't want to write yourself.
3. **Improve the site** — design tweaks, bug fixes, new components, accessibility improvements.

---

## 1. Writing a blog post

### Step 1 — Open a "Blog Post Idea" issue first

Before writing, open a [Blog Post Idea](.github/ISSUE_TEMPLATE/blog-post-idea.md) issue with:

- Working title
- A 2–3 sentence summary
- Who the target reader is (beginner / practitioner / researcher)
- Roughly what you'll cover

This avoids two people writing the same post and lets us give you feedback on scope early. We aim to respond within a few days.

### Step 2 — Write your post

1. Fork the repo and create a branch: `post/your-slug-here`
2. Add your post under `src/content/blog/your-slug-here.mdx`
3. Use the frontmatter schema (validated automatically on build):

   ```mdx
   ---
   title: 'Your Post Title'
   description: 'A 1-2 sentence summary that shows up in search and social previews.'
   pubDate: 2026-05-21
   author: 'your-github-handle'
   tags: ['inference', 'vllm', 'kv-cache']
   cover: './cover.png' # optional, relative to the post file
   draft: false
   ---

   Your content here, in Markdown + MDX.
   ```

4. If you have a cover image or inline diagrams, put them in `src/content/blog/your-slug-here/` alongside the `.mdx` file and import them.

5. Add yourself to `src/content/authors/your-github-handle.json` (first-time contributors only):

   ```json
   {
     "name": "Your Name",
     "bio": "One-sentence bio.",
     "github": "your-github-handle",
     "twitter": "optional",
     "website": "optional"
   }
   ```

### Step 3 — Open a Pull Request

- PR title: `post: <your post title>`
- Fill out the PR template
- A preview deploy will be generated automatically — check that everything renders correctly
- Tag a maintainer for review

### What we look for in a post

- **Specific, not generic.** "How vLLM's PagedAttention actually works" beats "Introduction to LLM inference."
- **Show, don't just tell.** Diagrams, code snippets, benchmarks, animations — whatever helps the reader build a mental model.
- **Honest tradeoffs.** Avoid hype. If something is slower in some cases, say so.
- **Cited claims.** If you reference a paper, benchmark, or codebase, link it.
- **Readable code.** Code blocks should be runnable or clearly marked as illustrative. Use syntax highlighting language tags (` ```python `, ` ```cuda `, etc.).
- **Accessible writing.** Define jargon on first use. Assume the reader knows ML basics but may not know your specific subfield.

There is **no minimum or maximum length**. Posts can be 800-word focused pieces or 8,000-word deep dives. Match the length to the topic.

### Content licensing

**You retain copyright on your post.** By submitting, you grant mlsystems.dev a non-exclusive, perpetual right to publish, display, and distribute your post on the site and in associated channels (RSS, newsletter, social media previews).

You can republish your own post elsewhere — you own it. Others cannot republish it without your permission. Linking, sharing URLs, and brief fair-use quotation are allowed without permission (this is standard copyright law, not anything special to this site).

See [LICENSE](LICENSE) for the full terms.

---

## 2. Suggesting a topic

If you want to read about something but don't want to write it yourself, open a [Topic Suggestion](.github/ISSUE_TEMPLATE/topic-suggestion.md) issue. Other contributors can claim it by commenting on the issue.

---

## 3. Improving the site

Site improvements (design, accessibility, performance, new interactive components, build tooling) are very welcome.

- Open an issue first for anything non-trivial so we can align on direction.
- For small fixes (typos, broken links, minor CSS), feel free to PR directly.
- Run `pnpm build` locally before pushing to catch type errors and broken content schemas.

---

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). In short: be kind, be patient, assume good intent. We're building this together.

---

## Questions?

Open a [GitHub Discussion](https://github.com/orgs/MLSysDev/discussions) — that's the best place for anything that isn't an actionable issue or PR.
