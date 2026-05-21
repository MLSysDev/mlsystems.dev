# Writing a tool

Tools on **mlsystems.dev** are interactive demos, calculators, visualizers — anything that helps a reader build intuition about ML systems by _doing_, not just reading.

Each tool is:

- One **MDX file** in `src/content/tools/` (metadata + explanation)
- Optionally, one **React component** in `src/components/tools/` (the interactive UI)

You can ship a "tool" that's just an explainer page (no interactive part) — start there if you're not sure what UI you want yet. Add the interactive component later.

> Looking for the contribution _process_ (forking, branching, PR review)? See [CONTRIBUTING.md](../CONTRIBUTING.md). This doc is the _how-to-build-a-tool_ part.

---

## 1. Decide what kind of tool

Two shapes ship today:

| Shape                | When to use                                                                                               | Files                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Explainer only**   | You have a clear idea but the interactive part isn't built yet, or the tool is a curated dataset/gallery. | One `.mdx` file                        |
| **Interactive demo** | You want readers to manipulate inputs and see live output.                                                | One `.mdx` file + one `.tsx` component |

Both render at `/playground/<slug>` using the same dynamic route — no extra wiring.

---

## 2. Create the MDX file

```bash
touch src/content/tools/your-slug-here.mdx
```

The filename becomes the URL slug: `your-slug-here.mdx` → `mlsystems.dev/playground/your-slug-here`.

Frontmatter:

```mdx
---
name: Your Tool Name
summary: One-sentence pitch that shows up in the card grid and OG card.
tag: Live # Live | Beta | Experimental | Soon
icon: ◇ # any single glyph or emoji
authors:
  - yourhandle # filename of your entry in src/content/authors/
topics:
  - inference # topic IDs from src/lib/data.ts (optional)
tags: [keywords] # for taxonomy (optional)
repo: https://github.com/you/your-tool # optional source link
core: false # true = render in the main /playground tabs (maintainers only)
featured: false # true = sort first in the community grid
draft: false # true = hide from /playground and sitemap
---
```

**Required:** `name`, `summary`, `tag`.
**All other fields optional.**

Validation is automatic via Zod schema in [`src/content/config.ts`](../src/content/config.ts) — bad frontmatter fails the build with a clear error.

---

## 3. Write the explainer body

After the frontmatter, write markdown:

```mdx
## What it does

A short paragraph or two on what the tool actually does. Be specific.

## Why it's useful

When would a reader reach for this? What's the alternative?

## How to use it

1. Step one
2. Step two
3. Step three

## Limitations

Be honest about what the tool _doesn't_ model. Readers will trust you more for it.
```

---

## 4. (Optional) Add the interactive component

If your tool has an interactive UI:

**Create the component:**

```tsx
// src/components/tools/YourTool.tsx
'use client';

import { useState } from 'react';
import { Field, Stat, StatRow } from './_shared'; // reusable helpers

export default function YourTool() {
  const [value, setValue] = useState(42);
  return (
    <div>
      <Field label="Some input" value={`${value}`}>
        <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(+e.target.value)} />
      </Field>

      <Stat label="Result" value={`${value * 2}`} accent />
    </div>
  );
}
```

**Embed it in your MDX file:**

```mdx
---
name: Your Tool Name
summary: …
tag: Live
---

import YourTool from '@/components/tools/YourTool';

<YourTool client:visible />

## What it does

…
```

The `client:visible` directive tells Astro to hydrate the component only when it scrolls into view — meaning a long explainer below won't pay a JS cost up front.

See [`src/components/tools/ThroughputCalc.tsx`](../src/components/tools/ThroughputCalc.tsx) for a working example.

---

## 5. Shared UI helpers

To keep the visual language consistent across tools, prefer the helpers in [`src/components/tools/_shared.tsx`](../src/components/tools/_shared.tsx):

- **`<Field label value>{children}</Field>`** — labeled input row with a uppercase mono label and a current-value chip on the right.
- **`<Stat label value accent? warn?>`** — large display number with a small mono label above. Use `accent` for the headline number.
- **`<StatRow label value />`** — single-line key/value row, ideal for breakdowns.

Site-wide CSS variables (`var(--accent)`, `var(--ink)`, `var(--paper)`, etc.) are available — use them instead of hard-coded colors so dark mode keeps working.

---

## 6. Preview locally

```bash
npm run dev
```

Open `http://localhost:4321/playground/your-slug-here` to see your tool render.

---

## 7. Submit a PR

Same flow as a blog post — see [CONTRIBUTING.md](../CONTRIBUTING.md). PR title: `tool: <your tool name>`.

Before opening:

```bash
npm run verify    # typecheck + lint + format check (also runs on every push)
```

---

## What happens after merge

- A static page is built at `/playground/your-slug-here`
- Your tool shows up as a card on `/playground` (unless `core: true`)
- An OG image is auto-generated at `/og/tool/your-slug-here.png`
- The page is added to `sitemap-index.xml` and the next crawler pass picks it up

That's the whole pipeline. No build config changes needed for a new tool — just the two files.

---

## Style guidance

Same as blog posts (see [CONTRIBUTING.md](../CONTRIBUTING.md#what-we-look-for-in-a-post)):

- **Specific over generic.** "Estimate KV-cache size for Llama-70B at batch 8" beats "Memory calculator."
- **Show your work in the explainer.** Where do the numbers come from? What did you assume?
- **Limitations belong in the post, not in your head.** Telling readers what the tool _can't_ do builds trust faster than another feature.
