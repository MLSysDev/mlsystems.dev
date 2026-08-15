import { restoreAsset } from '../storage/assets';
import { parseSource, SOURCE_FILENAME, type ParsedSource } from './source';
import { convertMdx } from '../convert/mdxToSource.mjs';
import { serializePost, type PostMeta, type SBlock } from './toMdx';

// A loaded post, plus anything the writer should know about how it loaded.
export type LoadedSource = ParsedSource & { notice?: string };

export const NOT_FOUND_MESSAGE = 'No editable post found at that link. Please try manual update.';

export const DIVERGED_MESSAGE =
  'This post\u2019s index.mdx was edited outside the editor, so it was loaded from the ' +
  'markdown rather than the saved editor data. Check custom components and table ' +
  'styling before publishing.';

export const UNCONVERTIBLE_MESSAGE =
  'This post\u2019s index.mdx was edited outside the editor but could not be read, so the ' +
  'older editor data was loaded instead. Publishing will overwrite those edits \u2014 copy ' +
  'anything you need out of index.mdx first.';

export const BAD_SOURCE_MESSAGE =
  'The editor data for that post is unreadable. Edit its index.mdx by hand instead.';

export const NETWORK_MESSAGE =
  'Could not reach GitHub to load that post. Check your connection and try again.';

function rawBase(repoUrl: string, slug: string, branch = 'main'): string {
  const clean = repoUrl
    .replace(/\/+$/, '')
    .replace('https://github.com/', 'https://raw.githubusercontent.com/');
  return `${clean}/${branch}/src/content/posts/${slug}/`;
}

export function slugFromInput(input: string): string {
  const t = input.trim();
  const blog = t.match(/\/blog\/([a-z0-9][a-z0-9-]*)/i);
  if (blog) return blog[1];
  const posts = t.match(/posts\/([a-z0-9][a-z0-9-]*)/i);
  if (posts) return posts[1];
  return t.replace(/\/+$/, '').split('/').pop() ?? t;
}

function imageNames(blocks: SBlock[], cover: string): string[] {
  const out: string[] = [];
  const walk = (list: SBlock[]) => {
    for (const b of list) {
      if (b.type === 'figure' && b.props.fileName) out.push(String(b.props.fileName));
      if (b.type === 'gallery') {
        try {
          out.push(
            ...(JSON.parse(String(b.props.fileNames || '[]')) as string[]).filter(
              (n) => !/^https?:/.test(n),
            ),
          );
        } catch {
          // malformed gallery — skip it
        }
      }
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  if (cover) out.push(cover);
  return [...new Set(out.filter(Boolean))];
}

// A post's body, normalised for comparison. Frontmatter is dropped
// deliberately: the serializer stamps `updated:` with today's date, so a
// regenerated file never matches a stored one there. What matters is the content.
function bodyOf(mdx: string): string {
  return mdx
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

// Frontmatter fields the MDX converter can read, and so is authoritative on.
function mergeMeta(sidecar: PostMeta, fromMdx: PostMeta): PostMeta {
  return {
    ...sidecar,
    title: fromMdx.title || sidecar.title,
    summary: fromMdx.summary || sidecar.summary,
    tags: fromMdx.tags.length ? fromMdx.tags : sidecar.tags,
    draft: fromMdx.draft,
    date: fromMdx.date || sidecar.date,
    coverFileName: fromMdx.coverFileName || sidecar.coverFileName,
  };
}

// Fallback for posts committed without editor data: fetch the index.mdx,
// convert it, pull its component files and repo-hosted images. `known` skips the
// fetch when the caller already holds the file.
async function fetchFromMdx(base: string, slug: string, known?: string): Promise<LoadedSource> {
  let text = known;
  if (text === undefined) {
    let res: Response;
    try {
      res = await fetch(base + 'index.mdx', { cache: 'no-store' });
    } catch {
      throw new Error(NETWORK_MESSAGE);
    }
    if (res.status === 404) throw new Error(NOT_FOUND_MESSAGE);
    if (!res.ok) throw new Error(NETWORK_MESSAGE);
    text = await res.text();
  }

  try {
    const names = new Set<string>();
    convertMdx(text, {
      slug,
      componentSource: (name) => {
        names.add(name);
        return '';
      },
    });
    const sources = new Map<string, string>();
    await Promise.all(
      [...names].map(async (name) => {
        try {
          const r = await fetch(`${base}${name}.tsx`, { cache: 'no-store' });
          if (r.ok) sources.set(name, await r.text());
        } catch {
          // component stays empty — writer can paste it in
        }
      }),
    );
    const { doc, warnings } = convertMdx(text, {
      slug,
      componentSource: (name) => sources.get(name) ?? '',
    });

    // The cover lives in the post folder like any other asset, and the editor
    // shows it from local storage — without this it opens blank.
    if (doc.meta.coverFileName) {
      try {
        const r = await fetch(base + encodeURIComponent(doc.meta.coverFileName), {
          cache: 'no-store',
        });
        if (r.ok) {
          const blob = await r.blob();
          const name = doc.meta.coverFileName;
          restoreAsset(name, new File([blob], name, { type: blob.type }));
        }
      } catch {
        // a missing cover shouldn't block opening the post
      }
    }

    const galleryNames = doc.blocks
      .filter((b) => b.type === 'gallery')
      .flatMap((b) => {
        try {
          // Remote entries are already fetchable by the browser.
          return (JSON.parse(String(b.props.fileNames || '[]')) as string[]).filter(
            (n) => !/^https?:/.test(n),
          );
        } catch {
          return [];
        }
      });
    await Promise.all(
      galleryNames.map(async (name) => {
        try {
          const r = await fetch(base + encodeURIComponent(name), { cache: 'no-store' });
          if (!r.ok) return;
          const blob = await r.blob();
          restoreAsset(name, new File([blob], name, { type: blob.type }));
        } catch {
          // a single missing image shouldn't block opening the post
        }
      }),
    );

    const local = doc.blocks.filter(
      (b) => b.type === 'figure' && b.props.src && !/^(https?:|data:)/.test(String(b.props.src)),
    );
    await Promise.all(
      local.map(async (b) => {
        const name = String(b.props.src).split('/').pop() ?? '';
        if (!name) return;
        try {
          const r = await fetch(base + encodeURIComponent(name), { cache: 'no-store' });
          if (!r.ok) return;
          const blob = await r.blob();
          restoreAsset(name, new File([blob], name, { type: blob.type }));
          b.props.fileName = name;
          b.props.src = '';
        } catch {
          // a single missing image shouldn't block opening the post
        }
      }),
    );
    // Anything the converter could not represent is the writer's problem to know
    // about before they hit publish, not after.
    return warnings.length > 0 ? { ...doc, notice: warnings.join(' ') } : doc;
  } catch {
    throw new Error(BAD_SOURCE_MESSAGE);
  }
}

// Pulls a published post's editor data + images straight from GitHub (raw),
// so a URL is all the writer needs to re-open it. Never throws for a missing
// image — only for a missing/unreadable post.
export async function fetchExisting(repoUrl: string, input: string): Promise<LoadedSource> {
  const slug = slugFromInput(input);
  const base = rawBase(repoUrl, slug);

  let res: Response;
  try {
    res = await fetch(base + SOURCE_FILENAME, { cache: 'no-store' });
  } catch {
    throw new Error(NETWORK_MESSAGE);
  }
  if (res.status === 404) return fetchFromMdx(base, slug);
  if (!res.ok) throw new Error(NETWORK_MESSAGE);

  const parsed = parseSource(await res.text());
  if (!parsed) throw new Error(BAD_SOURCE_MESSAGE);

  // The sidecar is the editor's record, but index.mdx is what the site builds
  // from — so wherever the two can disagree, the markdown wins.
  //
  // Publishing regenerates index.mdx wholesale from the editor's blocks, so a
  // sidecar left stale by an edit made outside the editor would silently revert
  // that edit on the next save. Re-serialising the sidecar and comparing bodies
  // is what detects it.
  try {
    const mdx = await fetch(base + 'index.mdx', { cache: 'no-store' });
    if (mdx.ok) {
      const text = await mdx.text();
      const regenerated = serializePost(parsed.meta, parsed.blocks, {
        tableVariants: parsed.tableVariants,
        today: new Date(),
      }).mdx;

      if (bodyOf(text) !== bodyOf(regenerated)) {
        try {
          // Converting is lossy for custom component source and table styling, so
          // the sidecar still supplies the fields the converter never reads — and
          // the writer is told.
          const fresh = await fetchFromMdx(base, slug, text);
          return {
            ...fresh,
            meta: mergeMeta(parsed.meta, fresh.meta),
            notice: [DIVERGED_MESSAGE, fresh.notice].filter(Boolean).join(' '),
          };
        } catch {
          // The markdown moved on but won't convert. Opening the sidecar beats
          // refusing to open anything, but publishing would overwrite the edit.
          return { ...parsed, notice: UNCONVERTIBLE_MESSAGE };
        }
      }

      // Bodies agree, so only frontmatter can have been touched by hand — and a
      // frontmatter-only edit leaves the bodies identical, so it cannot be
      // detected by the comparison above. Read it back through the converter
      // rather than re-deriving the field names here, which would drift.
      try {
        const { doc } = convertMdx(text, { slug, componentSource: () => '' });
        parsed.meta = mergeMeta(parsed.meta, doc.meta as PostMeta);
      } catch {
        parsed.meta.draft = /^draft:[ \t]*true[ \t]*$/m.test(text);
        if (!parsed.meta.date) {
          const m = text.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
          if (m) parsed.meta.date = m[1];
        }
      }
    }
  } catch {
    // An unreachable index.mdx just leaves the sidecar's own values in place.
  }

  await Promise.all(
    imageNames(parsed.blocks, parsed.meta.coverFileName).map(async (name) => {
      try {
        const r = await fetch(base + encodeURIComponent(name), { cache: 'no-store' });
        if (!r.ok) return;
        const blob = await r.blob();
        restoreAsset(name, new File([blob], name, { type: blob.type }));
      } catch {
        // a single missing image shouldn't block opening the post
      }
    }),
  );
  return parsed;
}
