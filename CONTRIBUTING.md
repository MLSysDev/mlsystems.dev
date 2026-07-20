# Contributing to mlsystems.dev

Welcome! This site is built openly, and every blog post here is the work of a contributor — possibly you next.

There are three main ways to contribute:

1. **Write a blog post** — share something you learned, built, or debugged.
2. **Suggest a topic** — propose something you want to read but don't want to write yourself.
3. **Improve the site** — design tweaks, bug fixes, new components, accessibility improvements.

---

## 1. Writing a post

You don't need Git, Markdown, or any local setup. Everything happens in a visual editor.

### Step 1 — Share your idea

Open a thread in [Blog ideas](https://github.com/orgs/MLSysDev/discussions/categories/blog-ideas) with a working title, a couple of sentences on what you'll cover, and who it's for. This avoids two people writing the same post and lets us give you feedback early. Prefer email? Send the same to **admin@mlsystems.dev**.

### Step 2 — Draft it

Write in the [visual editor](https://mlsystems.dev/write) — headings, images, tables, video, and math, all point-and-click. The preview shows exactly how it will read. Your draft stays in your browser until you send it.

Not finished in one sitting? Download your post and upload it back later to pick up where you left off — text, images, and all.

### Step 3 — Send it to us

When it's ready, hit **Submit post**. If you'd rather not use GitHub, download the post and email it to **admin@mlsystems.dev** instead.

### Step 4 — We review, then publish

We turn every submission into a pull request and review it there — a moderator checks it for clarity, correctness, and readability before it goes public. That's why you don't open the PR yourself: it keeps a consistent bar and a second pair of eyes on everything that ships. Once it's ready, we publish it and credit you.

### Becoming an author

Your first post is also how you get listed as an author — there's no separate application. Two ways:

- **In the editor** — when you draft your first post, add yourself as a new author right there (name, short bio, links). It travels with your post.
- **By email** — send the same details to **admin@mlsystems.dev**.

Either way, **give us an email address so we can confirm it's really you** before your name goes on a post. That address is just for verification — the public email shown on your profile is a separate, optional field. See [docs/becoming-an-author.md](docs/becoming-an-author.md) for the full field list.

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

If you want to read about something but don't want to write it yourself, post it in [Discussions](https://github.com/orgs/MLSysDev/discussions). Other contributors can claim it by replying to the thread.

---

## 3. Improving the site

Site improvements (design, accessibility, performance, new interactive components, build tooling) are very welcome.

- Open an issue first for anything non-trivial so we can align on direction.
- For small fixes (typos, broken links, minor CSS), feel free to PR directly.
- Run `npm run build` locally before pushing to catch type errors and broken content schemas.

---

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). In short: be kind, be patient, assume good intent. We're building this together.

---

## Questions?

Open a [GitHub Discussion](https://github.com/orgs/MLSysDev/discussions) — that's the best place for anything that isn't an actionable issue or PR.
