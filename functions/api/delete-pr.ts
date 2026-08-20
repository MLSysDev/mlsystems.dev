// Cloudflare Pages Function: opens a pull request that deletes a post's folder,
// via the same GitHub App used by create-pr.ts.

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

type Env = {
  GH_APP_ID?: string;
  GH_APP_INSTALLATION_ID?: string;
  GH_APP_PRIVATE_KEY?: string;
  GH_REPO?: string;
  ALLOWED_ORIGIN?: string;
  RATE_LIMIT?: KVStore;
};

const DEFAULT_REPO = 'MLSysDev/mlsystems.dev';
const DEFAULT_ORIGIN = 'https://mlsystems.dev';
const UA = 'mlsystems-write';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_DELETES_PER_HOUR = 5;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function b64urlString(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function appJwt(appId: string, pem: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64urlString(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data));
  return `${data}.${b64urlBytes(new Uint8Array(sig))}`;
}

async function gh(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': UA,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `GitHub API error (${res.status}).`);
  }
  return res.status === 204 ? {} : ((await res.json()) as Record<string, unknown>);
}

// Recursively lists every file under a folder on main — this is exactly what
// gets deleted, so it must walk subdirectories rather than just the top level.
async function listFolderFiles(
  owner: string,
  name: string,
  dir: string,
  token: string,
): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/contents/${encodeURI(dir)}?ref=main`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': UA,
        'x-github-api-version': '2022-11-28',
      },
    },
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Could not list ${dir} (GitHub API error ${res.status}).`);
  const entries = (await res.json()) as { path: string; type: 'file' | 'dir' }[];
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.type === 'dir')
      files.push(...(await listFolderFiles(owner, name, entry.path, token)));
    else files.push(entry.path);
  }
  return files;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  const allowed = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
  const origin = request.headers.get('origin');
  if (origin && origin !== allowed) return json({ error: 'Forbidden origin.' }, 403);

  let payload: { slug?: string; title?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const slug = (payload.slug ?? '').trim();
  const title = (payload.title ?? '').trim().slice(0, 200) || slug;
  if (!slug) return json({ error: 'Missing post slug.' }, 400);
  if (!SLUG_RE.test(slug) || slug.length > 80) {
    return json({ error: 'Invalid URL slug.' }, 400);
  }

  const appId = env.GH_APP_ID;
  const installationId = env.GH_APP_INSTALLATION_ID;
  const privateKey = env.GH_APP_PRIVATE_KEY;
  if (!appId || !installationId || !privateKey) {
    return json({ error: 'Deleting is not configured on the server yet.' }, 500);
  }

  if (env.RATE_LIMIT) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const key = `delete-pr:${ip}`;
    const count = Number((await env.RATE_LIMIT.get(key)) ?? '0');
    if (count >= MAX_DELETES_PER_HOUR) {
      return json({ error: 'Too many delete requests — please try again in an hour.' }, 429);
    }
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3600 });
  }

  const [owner, name] = (env.GH_REPO || DEFAULT_REPO).split('/');
  const dir = `src/content/posts/${slug}`;

  try {
    const jwt = await appJwt(appId, privateKey);
    const inst = (await gh(`/app/installations/${installationId}/access_tokens`, jwt, {
      method: 'POST',
    })) as { token: string };
    const token = inst.token;

    const paths = await listFolderFiles(owner, name, dir, token);
    if (paths.length === 0) {
      return json(
        { error: `${dir} doesn't exist on main — there's nothing there to delete.` },
        404,
      );
    }

    const ref = (await gh(`/repos/${owner}/${name}/git/ref/heads/main`, token)) as {
      object: { sha: string };
    };
    const baseSha = ref.object.sha;
    const baseCommit = (await gh(`/repos/${owner}/${name}/git/commits/${baseSha}`, token)) as {
      tree: { sha: string };
    };

    // Every path from the folder listing, repeated with sha: null — the Git Trees
    // API convention for "remove this path", leaving everything else untouched.
    const tree = paths.map((path) => ({
      path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: null,
    }));

    const newTree = (await gh(`/repos/${owner}/${name}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
    })) as { sha: string };

    const commit = (await gh(`/repos/${owner}/${name}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message: `Delete post: ${title}`,
        tree: newTree.sha,
        parents: [baseSha],
      }),
    })) as { sha: string };

    const rand = Math.random().toString(36).slice(2, 8);
    const branch = `delete/${slug}-${rand}`;
    await gh(`/repos/${owner}/${name}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });

    const body = [
      `Removes \`${dir}/\` — ${paths.length} file${paths.length === 1 ? '' : 's'}.`,
      '',
      '---',
      '',
      'Merge this to delete the post, or close it to keep everything as is.',
    ].join('\n');

    const pr = (await gh(`/repos/${owner}/${name}/pulls`, token, {
      method: 'POST',
      body: JSON.stringify({ title: `Delete post: ${title}`, head: branch, base: 'main', body }),
    })) as { html_url: string; number: number };

    try {
      await gh(`/repos/${owner}/${name}/issues/${pr.number}/labels`, token, {
        method: 'POST',
        body: JSON.stringify({ labels: ['post-deletion'] }),
      });
    } catch {
      // labeling is optional
    }

    return json({ url: pr.html_url, number: pr.number });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Could not create the pull request.' },
      502,
    );
  }
}
