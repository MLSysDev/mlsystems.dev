# Authoring a post as a `.write-source.json` file

The `/write` editor on mlsystems.dev loads drafts directly from a JSON file — the same format the site generates alongside every published post. This lets an AI agent (or a script) produce a complete first draft that a human refines in the editor.

**Flow:** author the JSON → open `mlsystems.dev/write` → click **Upload JSON** (top left) → the draft appears fully editable → refine → download/publish as usual.

The filename doesn't matter (`my-post.write-source.json` is a good convention); the loader recognizes the file by its `kind` marker. A complete working example lives next to this guide — [`sample.write-source.json`](./sample.write-source.json) — exercising **every** supported block. Start from it.

## Top-level shape

```json
{
  "kind": "mlsys-write-source",
  "version": 1,
  "meta": { ... },
  "blocks": [ ... ],
  "tableVariants": { ... }
}
```

`kind` and `version` must be exactly as shown — anything else is rejected.

## `meta` — post metadata

```json
{
  "title": "Post title",
  "summary": "1–3 sentence summary shown under the title and used for SEO.",
  "authors": ["guest"],
  "writerName": "Author Name",
  "topicId": "architecture",
  "topicName": "Architecture",
  "tags": ["fundamentals", "attention"],
  "slug": "my-post-slug",
  "coverFileName": "",
  "ogCard": false,
  "proposedTopic": "",
  "newAuthor": null
}
```

| Field                   | Meaning                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `authors`               | Credited author **handles** (list — posts can have co-authors). Must exist in `src/content/authors/`; use `["guest"]` if unsure. |
| `writerName`            | The single person submitting the draft (attribution on the ZIP/PR), independent of credited authors.                             |
| `topicId` / `topicName` | Must match an existing topic in `src/content/topics/`. No fit? Leave `topicId` `""` and set `proposedTopic`.                     |
| `slug`                  | Lowercase, hyphenated, unique → URL `/blog/<slug>`.                                                                              |
| `coverFileName`         | Leave `""` — covers are added in the editor.                                                                                     |
| `ogCard`                | `true` renders a generated share card over the cover. Only meaningful with a cover.                                              |
| `newAuthor`             | `null`, or a self-registration `{ "handle", "name", "bio", "github", ... }` for a first-time author.                             |
| `date`                  | Omit for new posts (set automatically); only present when editing an existing post.                                              |

## `blocks` — the document

Every block has this shape:

```json
{ "id": "unique-string", "type": "...", "props": { ... }, "content": [ ... ], "children": [] }
```

- `id` — any unique string (`"p-intro"`, `"table-1"`, …). Never reuse one; tables are also keyed by id in `tableVariants`.
- Text blocks carry inline runs in `content`; media/embed blocks have **no `content` key at all**.
- `children` nests blocks (used by `toggleListItem`; otherwise `[]`).

### Inline runs (the `content` of text blocks)

```json
{ "type": "text", "text": "plain", "styles": {} }
{ "type": "text", "text": "bold", "styles": { "bold": true } }
{ "type": "text", "text": "code", "styles": { "code": true } }
{ "type": "text", "text": "colored", "styles": { "textColor": "red" } }
{ "type": "link", "href": "https://…", "content": [{ "type": "text", "text": "label", "styles": {} }] }
```

**Style options:**

- Booleans: `bold`, `italic`, `underline`, `strike`, `code`
- `textColor` / `backgroundColor` — one of: `gray`, `brown`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink` (or `"default"`). Use sparingly — body text should stay default.
- **`code` is exclusive** — it cannot combine with any other style (`{ "code": true, "bold": true }` is rejected by the editor). A run is either code or styled text, never both.

### Text blocks

Shared default props: `{ "backgroundColor": "default", "textColor": "default", "textAlignment": "left" }`.

**Options:** `textAlignment`: `"left"` | `"center"` | `"right"`; `backgroundColor`/`textColor`: same named colors as inline styles (block-wide tint).

| Type               | Extra props                                       | Notes                                                                                                           |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `paragraph`        | —                                                 | body text                                                                                                       |
| `heading`          | `"level": 1`, `"isToggleable": false`             | levels 1–3; publishes one step deeper (the post title owns H1): level 1 → H2 section, 2 → H3 subsection, 3 → H4 |
| `bulletListItem`   | —                                                 | **exact spelling** — one block per bullet; consecutive items group                                              |
| `numberedListItem` | —                                                 | one block per item                                                                                              |
| `checkListItem`    | `"checked": false`                                | task list                                                                                                       |
| `toggleListItem`   | —                                                 | collapsible; hidden blocks go in `children`                                                                     |
| `quote`            | only `backgroundColor`/`textColor` (no alignment) | pull-quote                                                                                                      |
| `note`             | `"props": {}`                                     | highlighted callout/aside for key takeaways                                                                     |

### Code

```json
{
  "id": "code-1",
  "type": "codeBlock",
  "props": { "language": "python" },
  "content": [{ "type": "text", "text": "line one\nline two", "styles": {} }],
  "children": []
}
```

One single run with `\n` between lines.

**`language` options** (use `text` for plain text): `text`, `python`, `typescript`, `tsx`, `javascript`, `jsx`, `json`, `jsonc`, `jsonl`, `shellscript` (bash), `sql`, `c`, `cpp`, `csharp`, `java`, `kotlin`, `swift`, `objective-c`, `rust`, `ruby`, `scala`, `haskell`, `lua`, `julia`, `r`, `php`, `html`, `css`, `scss`, `sass`, `less`, `postcss`, `vue`, `vue-html`, `svelte`, `markdown`, `mdx`, `latex`, `yaml`, `xml`, `graphql`, `regexp`, `mermaid`, `wasm`, `wgsl`, `glsl`, `haml`, `pug`.

### Table

Cells are `tableCell` objects (not bare arrays):

```json
{
  "id": "table-1",
  "type": "table",
  "props": { "textColor": "default" },
  "content": {
    "type": "tableContent",
    "columnWidths": [null, null],
    "rows": [
      {
        "cells": [
          {
            "type": "tableCell",
            "content": [{ "type": "text", "text": "Header A", "styles": {} }],
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "backgroundColor": "default",
              "textColor": "default",
              "textAlignment": "left"
            }
          },
          {
            "type": "tableCell",
            "content": [{ "type": "text", "text": "Header B", "styles": {} }],
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "backgroundColor": "default",
              "textColor": "default",
              "textAlignment": "left"
            }
          }
        ]
      }
    ]
  },
  "children": []
}
```

The first row renders as the header. Style a table via top-level `tableVariants`, keyed by block id:

```json
"tableVariants": { "table-1": { "border": "rule", "zebra": true } }
```

`border`: `"rule"` | `"lined"` | `"plain"`; `zebra` stripes alternate rows.

### Math (display LaTeX)

```json
{ "id": "math-1", "type": "math", "props": { "latex": "y = f(Wx + b)" }, "children": [] }
```

**Options:** `latex` is the only prop — a display-mode KaTeX expression, always rendered centered on its own line. There is no alt/caption field; the LaTeX source itself is the accessible text. Double-escape backslashes in JSON: `"\\text{params}"`. For inline math inside a sentence, there is no inline-math style — write it as `code` styled text or keep the expression in a math block.

### Separator / divider

```json
{ "id": "sep-1", "type": "separator", "props": {}, "children": [] }
{ "id": "div-1", "type": "divider", "props": {}, "children": [] }
```

`separator` renders as a `· · ·` section break; `divider` renders as a straight horizontal line (typing `---` in the editor creates a `divider`).

### Figure (image)

```json
{
  "id": "fig-1",
  "type": "figure",
  "props": {
    "fileName": "",
    "src": "https://placehold.co/720x400?text=Replace+me",
    "alt": "what the image shows",
    "caption": "Caption text.",
    "width": 360
  },
  "children": []
}
```

JSON can't carry image binaries. Two placeholder strategies:

- **Previewable placeholder (recommended for agents):** leave `fileName` `""` and set `src` to a placeholder URL with a descriptive `alt` + `caption` — it renders in the editor so the writer sees where the real image goes, then replaces it.
- **Empty slot:** leave both `""`; the block shows an upload placeholder.

**Options:**

- `width` — the figure size; must be one of exactly three values: `360` (Small), `620` (Medium), `960` (Large). Any other number falls back to Small.
- `alt` — required for accessibility; describe what the image shows.
- `caption` — shown under the image; may be `""`.

### Gallery (image group)

```json
{ "id": "gal-1", "type": "gallery", "props": { "fileNames": "[]", "alts": "[]", "min": "" }, "children": [] }
```

**Options:**

- `fileNames` / `alts` — **JSON-encoded strings**, not arrays (e.g. `"[\"a.png\",\"b.png\"]"`). Leave `"[]"` and let the writer upload images; one alt per image, same order.
- `min` — minimum image width in px as a string (e.g. `"220"`); controls how many images fit per row. Leave `""` for the default grid.

### Video (YouTube)

```json
{ "id": "vid-1", "type": "video", "props": { "videoId": "aircAruvnKk", "caption": "Caption." }, "children": [] }
```

`videoId` is the 11-character YouTube id (the `v=` param), not a URL.

### Inline SVG diagram

```json
{
  "id": "svg-1",
  "type": "svg",
  "props": { "code": "<svg viewBox=\"0 0 470 160\" …>…</svg>", "caption": "Caption." },
  "children": []
}
```

Agents **can and should** author complete diagrams this way. Rules: use `stroke="currentColor"` / `fill="currentColor"` so the diagram adapts to light/dark theme; set `style="width:100%;max-width:520px;height:auto;color:currentColor"` on the root; keep `viewBox` around 470 wide; include `role="img"` + `aria-label`.

### Custom React component (interactive embeds)

```json
{
  "id": "comp-1",
  "type": "customComponent",
  "props": {
    "componentName": "ParamCounter",
    "source": "export default function ParamCounter() {\n  return <div>…</div>;\n}\n"
  },
  "children": []
}
```

`source` is a complete TSX module with a default export; `componentName` matches the function name. It ships as a separate file next to the post.

Optional display props (all default off — omit them for a component that renders inline at normal width):

- `frameTitle` (string) — small mono label above the component.
- `frameSize` (`"normal"` | `"wide"`) — `"wide"` renders at up to 960px, extending past the text column; clamps to the screen on mobile.
- `frameExpand` (boolean) — adds an expand button that opens the component in a fullscreen overlay (Esc closes, state preserved).

When any of these is set, the published MDX wraps the component in the site's `<Interactive>` frame automatically.

## Rules of thumb for a good agent draft

1. Use heading level 1 for sections and 2 for subsections — `meta.title` is the page's H1, so editor levels publish one step deeper (level 1 → H2).
2. Short paragraphs; one `note` per major section carrying the takeaway.
3. Prefer authored `svg` diagrams over empty figure slots; when a photo/screenshot is genuinely needed, use a placeholder-`src` figure with a caption telling the writer what to drop in.
4. Every id unique; JSON must parse — validate before handing over.
5. Don't invent topic ids or author handles — check `src/content/topics/` and `src/content/authors/`, or use `proposedTopic` / `["guest"]`.

## Converting an existing MDX post (backup tool)

[`mdx-to-write-source.mjs`](./mdx-to-write-source.mjs) converts a published post back into an uploadable JSON — useful if a post's `.write-source.json` sidecar is ever missing:

```bash
node docs/authoring/mdx-to-write-source.mjs src/content/posts/<slug> [out.json]
```

Best-effort, not a guaranteed round-trip: it maps standard markdown — headings, bold/italic/strike/links/inline code, bullet/numbered/check lists, quotes, horizontal rules, code fences, tables, markdown images (as figure placeholders with their URL), plus this site's `<Note>` and inline-SVG `<Figure>` components. Unrecognized MDX maps to the closest editor block. Good enough to port a post written outside the editor, then finish by hand in `/write`.

## Prompt to give your agent

> Write a first draft of a blog post for mlsystems.dev as a single `.write-source.json` file, following `docs/authoring/write-source-format.md` exactly (top-level `kind: "mlsys-write-source"`, `version: 1`, `meta`, `blocks`, `tableVariants`; block shapes and type names exactly as documented — note it's `bulletListItem`, tables use `tableCell` objects, and media blocks omit `content`). Use heading level 1 for sections, 2 for subsections. Author diagrams as theme-aware inline `svg` blocks (currentColor); for photos use `figure` blocks with a placeholder `src` and a caption saying what image to add. All ids unique; valid JSON. Topic id and author handles must come from the site's existing lists (or use `proposedTopic` / `["guest"]`). The post: [describe your post here].
