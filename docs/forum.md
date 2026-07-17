# Forum (GitHub Discussions mirror)

The `/forum` section is a read-only, SEO-indexed mirror of this repo's
**GitHub Discussions**. GitHub is the source of truth for everything —
identity, posting, moderation, notifications, `@mentions`. The website fetches
discussions at build time, renders them as static pages Google can index, and
lets people **read live and comment inline** without leaving the site.

## How people use it

**Start a new topic** — on GitHub: repo → **Discussions → New discussion**,
pick a category. (The "Start a discussion" button on `/forum` links here.)
It appears on the site after the next build.

**Comment / reply** — inline on the thread page, using the giscus
"Sign in with GitHub" box. Replies post to the GitHub discussion and show up
immediately in the widget.

**Vote in a poll** — poll results render on the site; the "Vote on GitHub" link
opens the poll to cast a vote. (giscus can't vote inline.)

## What shows up

Every discussion category **except**:

- **Comments** — used by giscus for blog-post comments, not forum threads.
- Any other slug listed in `EXCLUDED_CATEGORY_SLUGS` in `src/lib/forum.ts`.

Categories are pulled from GitHub automatically — add or rename one in
**Settings → Discussions** and it flows through on the next build. Nothing is
hardcoded.

## Build & environment setup

The forum needs a read-only token at **build time** to read Discussions, and a
deploy hook so it rebuilds when discussions change.

| Where                                           | Name                         | Purpose                                                                                                                    |
| ----------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Pages → Settings → Variables (build) | `GITHUB_TOKEN`               | Lets the build read Discussions. Without it the forum renders empty. Fine-grained PAT, read-only Discussions on this repo. |
| GitHub → Settings → Secrets → Actions           | `CLOUDFLARE_DEPLOY_HOOK_URL` | The Cloudflare Pages deploy-hook URL. The `forum-sync` workflow POSTs to it.                                               |

The deploy hook itself is created in **Cloudflare Pages → Settings → Builds →
Deploy hooks** (branch `main`); copy its URL into the GitHub secret above.

`.github/workflows/forum-sync.yml` triggers a rebuild on discussion and comment
events, plus a daily cron. If the secret is unset it no-ops.

Inline commenting reuses the same `PUBLIC_GISCUS_REPO_ID` already configured for
blog comments — no extra setup.

### Test the build locally

```bash
GITHUB_TOKEN=$(gh auth token) npm run build && npm run preview
# open http://localhost:4321/forum
```
