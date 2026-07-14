// Cloudflare Pages Function: per-post like counter backed by D1.
// Degrades gracefully — with no DB bound it returns { count: null } and the
// UI simply hides the number, never erroring.

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(col?: string): Promise<T | null>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
type Env = { DB?: D1Database };

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function slugOf(params: { slug?: string | string[] }): string | null {
  const raw = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  return raw && SLUG_RE.test(raw) ? raw : null;
}

export async function onRequestGet(context: {
  env: Env;
  params: { slug?: string | string[] };
}): Promise<Response> {
  const slug = slugOf(context.params);
  if (!slug) return json({ error: 'Invalid slug.' }, 400);
  if (!context.env.DB) return json({ count: null });
  try {
    const row = await context.env.DB.prepare('SELECT count FROM likes WHERE slug = ?')
      .bind(slug)
      .first<{ count: number }>();
    return json({ count: row?.count ?? 0 });
  } catch {
    return json({ count: null });
  }
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
  params: { slug?: string | string[] };
}): Promise<Response> {
  const slug = slugOf(context.params);
  if (!slug) return json({ error: 'Invalid slug.' }, 400);
  if (!context.env.DB) return json({ count: null });

  let op: 'like' | 'unlike' = 'like';
  try {
    const body = (await context.request.json()) as { op?: string };
    if (body?.op === 'unlike') op = 'unlike';
  } catch {
    // default to like
  }
  const delta = op === 'unlike' ? -1 : 1;

  try {
    const row = await context.env.DB.prepare(
      `INSERT INTO likes (slug, count) VALUES (?, ?)
       ON CONFLICT(slug) DO UPDATE SET count = MAX(0, count + ?)
       RETURNING count`,
    )
      .bind(slug, Math.max(0, delta), delta)
      .first<{ count: number }>();
    return json({ count: row?.count ?? 0 });
  } catch {
    return json({ count: null });
  }
}
