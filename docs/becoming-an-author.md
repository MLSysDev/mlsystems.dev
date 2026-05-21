# Becoming an author

Authors on **mlsystems.dev** are just JSON files. Adding yourself takes about two minutes — once your file lands on `main`, you have a profile page, an Open Graph card, and you can be credited on any article.

> Writing your first post? See [writing-articles.md](./writing-articles.md). This doc covers the author profile only.

---

## 1. Create your author file

Pick a handle. This becomes your URL and `@mention`, and it's **permanent** — changing it later breaks inbound links and your Open Graph card.

**Rules:** lowercase, no spaces, ASCII only. Hyphens allowed.

**Conventions** (in priority order):

1. **Single name** if unambiguous — `priya`, `naoko`
2. **`firstname-lastname`** if your first name is common or already taken — `priya-sharma`, `liam-chen`
3. **`firstinitiallastname`** for the very common case — `psharma`, `lchen`

The filename is the source of truth — you literally cannot create two files with the same handle, so collisions are caught by the filesystem. If your preferred handle is taken, check `src/content/authors/` and pick one of the fallback patterns above.

```bash
touch src/content/authors/<your-handle>.json
```

---

## 2. Fill in the fields

Only `name` is required. Everything else is optional and only renders if you provide it.

```json
{
  "name": "Your Full Name",
  "bio": "Two or three sentences about what you work on and what you write about. Keep it specific — \"ML engineer\" is weak, \"speculative decoding kernels for production serving\" is strong.",
  "role": "contributor",

  "github": "https://github.com/yourhandle",
  "twitter": "https://x.com/yourhandle",
  "linkedin": "https://linkedin.com/in/yourhandle",
  "mastodon": "https://mastodon.social/@yourhandle",
  "bluesky": "https://bsky.app/profile/yourhandle.bsky.social",
  "website": "https://your-site.com",
  "email": "you@example.com"
}
```

### Field reference

| Field      | Required | Notes                                                                      |
| ---------- | -------- | -------------------------------------------------------------------------- |
| `name`     | yes      | Your display name. Shows in bylines, profile, OG cards.                    |
| `bio`      | no       | 2–3 sentences. Renders on your profile + (truncated) on `/authors`.        |
| `role`     | no       | Defaults to `contributor`. Use anything you like — `researcher`, `editor`. |
| `github`   | no       | Full URL.                                                                  |
| `twitter`  | no       | Full URL (X.com works too).                                                |
| `linkedin` | no       | Full URL.                                                                  |
| `mastodon` | no       | Full URL including instance.                                               |
| `bluesky`  | no       | Full URL.                                                                  |
| `website`  | no       | Personal site, lab page, anything you want linked.                         |
| `email`    | no       | Plain address — gets wrapped in `mailto:`. Will be publicly visible.       |
| `avatar`   | no       | Future use. Currently we render initials only.                             |

Need another platform (Threads, Hacker News, ORCID, Google Scholar)? Open a PR — the schema in [src/content/config.ts](../src/content/config.ts) is two lines per field.

---

## 3. Get credited on a post

Once your file is on `main`, any post can list you as an author by handle:

```yaml
---
authors:
  - your-handle
  - co-author-handle
---
```

The build fails if a post references a handle that doesn't have a JSON file — typo protection.

---

## 4. Submit

1. Fork the repo
2. Add your JSON file (and any post MDX you want to publish with it)
3. Open a PR

CI runs `astro check` + build + lint. If schema validation passes, a maintainer will review and merge. Your profile goes live on the next deploy.

---

## What gets generated automatically

When your author file lands on `main`, the build pipeline produces:

- `/authors/<your-handle>` — your profile page with bio, social links, and list of your articles
- `/og/author/<your-handle>.png` — Open Graph card for sharing your profile
- An entry in `/authors` — the public Contributors index
- Bylines on every post you're credited on, linking back to your profile
- Inclusion in `/sitemap-index.xml` so search engines find you

No admin UI, no database, no waiting on a maintainer to "set up your account." It's just files.
