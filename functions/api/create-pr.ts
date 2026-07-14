// Cloudflare Pages Function: opens a pull request on the repo directly via github app

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
  // Optional KV namespace; when bound, submissions are throttled per IP.
  RATE_LIMIT?: KVStore;
};

type PostFile = { path: string; content: string; encoding: 'utf-8' | 'base64' };

const DEFAULT_REPO = 'MLSysDev/mlsystems.dev';
const DEFAULT_ORIGIN = 'https://mlsystems.dev';
const CONTACT_EMAIL = 'admin@mlsystems.dev';
const UA = 'mlsystems-write';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const AUTHOR_PATH_RE = /^src\/content\/authors\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const MAX_FILES = 40;
const MAX_FILE_CHARS = 8_000_000;
const MAX_TOTAL_CHARS = 24_000_000;
const MAX_SUBMISSIONS_PER_HOUR = 5;

// Every file must live in the post's own folder (flat, safe names) — except a
// single new-author profile. Anything else could overwrite arbitrary repo files.
function invalidPath(files: PostFile[], slug: string): string | null {
  const postDir = `src/content/posts/${slug}/`;
  let authorFiles = 0;
  for (const f of files) {
    if (AUTHOR_PATH_RE.test(f.path)) {
      if (++authorFiles > 1) return f.path;
      continue;
    }
    if (!f.path.startsWith(postDir)) return f.path;
    if (!FILE_NAME_RE.test(f.path.slice(postDir.length))) return f.path;
  }
  return null;
}

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

async function fileExistsOnMain(
  owner: string,
  name: string,
  path: string,
  token: string,
): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/contents/${encodeURI(path)}?ref=main`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': UA,
        'x-github-api-version': '2022-11-28',
      },
    },
  );
  return res.ok;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  const allowed = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
  const origin = request.headers.get('origin');
  if (origin && origin !== allowed) return json({ error: 'Forbidden origin.' }, 403);

  let payload: {
    title?: string;
    slug?: string;
    summary?: string;
    files?: PostFile[];
    isEdit?: boolean;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const slug = (payload.slug ?? '').trim();
  const title = (payload.title ?? '').trim().slice(0, 200) || slug;
  const summary = (payload.summary ?? '').trim().slice(0, 500);
  const files = payload.files ?? [];
  const isEdit = payload.isEdit === true;
  if (!slug || files.length === 0) return json({ error: 'Missing post data.' }, 400);
  if (!SLUG_RE.test(slug) || slug.length > 80) {
    return json({ error: 'Invalid URL slug.' }, 400);
  }
  if (files.length > MAX_FILES) return json({ error: 'Too many files in this post.' }, 400);
  let totalChars = 0;
  for (const f of files) {
    if (typeof f.path !== 'string' || typeof f.content !== 'string') {
      return json({ error: 'Invalid file entry.' }, 400);
    }
    totalChars += f.content.length;
    if (f.content.length > MAX_FILE_CHARS || totalChars > MAX_TOTAL_CHARS) {
      return json({ error: 'This post is too large to submit — reduce image sizes.' }, 413);
    }
  }
  const badPath = invalidPath(files, slug);
  if (badPath) return json({ error: `File path not allowed: ${badPath}` }, 400);

  const appId = env.GH_APP_ID;
  const installationId = env.GH_APP_INSTALLATION_ID;
  const privateKey = env.GH_APP_PRIVATE_KEY;
  if (!appId || !installationId || !privateKey) {
    return json({ error: 'Publishing is not configured on the server yet.' }, 500);
  }

  if (env.RATE_LIMIT) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const key = `create-pr:${ip}`;
    const count = Number((await env.RATE_LIMIT.get(key)) ?? '0');
    if (count >= MAX_SUBMISSIONS_PER_HOUR) {
      return json({ error: 'Too many submissions — please try again in an hour.' }, 429);
    }
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3600 });
  }

  const [owner, name] = (env.GH_REPO || DEFAULT_REPO).split('/');

  try {
    const jwt = await appJwt(appId, privateKey);
    const inst = (await gh(`/app/installations/${installationId}/access_tokens`, jwt, {
      method: 'POST',
    })) as { token: string };
    const token = inst.token;

    // A brand-new post must not silently overwrite an existing one at the same slug.
    // Edits (loaded via the portal's "Open existing post") are meant to. isEdit is
    // client-supplied, so the server checks reality itself and labels updates loudly —
    // maintainer review of the PR is the trust boundary for overwrites.
    const postExists = await fileExistsOnMain(
      owner,
      name,
      `src/content/posts/${slug}/index.mdx`,
      token,
    );
    if (!isEdit && postExists) {
      return json(
        { error: 'A post with this URL already exists. Change the URL slug and try again.' },
        409,
      );
    }
    const isUpdate = isEdit && postExists;

    // A newly registered author must not overwrite an existing profile at the same handle.
    const authorFile = files.find((f) => f.path.startsWith('src/content/authors/'));
    if (authorFile && (await fileExistsOnMain(owner, name, authorFile.path, token))) {
      return json(
        { error: 'That author handle is already taken. Pick another handle and try again.' },
        409,
      );
    }

    const ref = (await gh(`/repos/${owner}/${name}/git/ref/heads/main`, token)) as {
      object: { sha: string };
    };
    const baseSha = ref.object.sha;
    const baseCommit = (await gh(`/repos/${owner}/${name}/git/commits/${baseSha}`, token)) as {
      tree: { sha: string };
    };

    const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
    for (const f of files) {
      const blob = (await gh(`/repos/${owner}/${name}/git/blobs`, token, {
        method: 'POST',
        body: JSON.stringify({
          content: f.content,
          encoding: f.encoding === 'base64' ? 'base64' : 'utf-8',
        }),
      })) as { sha: string };
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = (await gh(`/repos/${owner}/${name}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
    })) as { sha: string };

    const commit = (await gh(`/repos/${owner}/${name}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message: `${isUpdate ? 'Update' : 'Add'} post: ${title}`,
        tree: newTree.sha,
        parents: [baseSha],
      }),
    })) as { sha: string };

    const rand = Math.random().toString(36).slice(2, 8);
    const branch = `post/${slug}-${rand}`;
    await gh(`/repos/${owner}/${name}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });

    const banner = (() => {
      const width = 52;
      const bold = (s: string) =>
        [...s]
          .map((ch) => {
            const c = ch.codePointAt(0) ?? 0;
            if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + (c - 65));
            if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + (c - 97));
            if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + (c - 48));
            return ch;
          })
          .join('');
      const center = (s: string) => {
        const total = width - [...s].length;
        const left = Math.floor(total / 2);
        return ' '.repeat(left) + s + ' '.repeat(total - left);
      };
      const bar = '═'.repeat(width);
      const blank = ' '.repeat(width);
      return [
        '```',
        `╔${bar}╗`,
        `║${blank}║`,
        `║${center(bold('M L S Y S T E M S . D E V'))}║`,
        `║${blank}║`,
        `╚${bar}╝`,
        '```',
      ].join('\n');
    })();

    const welcomeNote = authorFile
      ? [
          '',
          '> [!NOTE]',
          '> **Welcome to MLSystems.dev** 🎉 Thank you for joining us and sharing your',
          '> knowledge with the community — we’re thrilled to have you here. Your author',
          '> profile is included in this request and goes live together with your post.',
        ]
      : [];

    const body = [
      banner,
      '',
      `## ${title}`,
      ...(summary ? ['', `_${summary}_`] : []),
      '',
      '---',
      '',
      '> [!IMPORTANT]',
      '> To confirm your identity, please **comment below with your name**.',
      ...welcomeNote,
      '',
      '> [!TIP]',
      '> **Preview** — a link to your post appears below once the Cloudflare check passes.',
      '',
      '---',
      '',
      `> Questions or issues? Email [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) with this PR link.`,
      '',
      `<!-- post-slug: ${slug} -->`,
    ].join('\n');

    const pr = (await gh(`/repos/${owner}/${name}/pulls`, token, {
      method: 'POST',
      body: JSON.stringify({
        title: `${isUpdate ? 'Update post' : 'New post'}: ${title}`,
        head: branch,
        base: 'main',
        body,
      }),
    })) as { html_url: string; number: number };

    // Best-effort label for triage. Needs Issues: write on the App + the label to
    // exist; ignore failures so a missing permission never blocks the submission.
    try {
      await gh(`/repos/${owner}/${name}/issues/${pr.number}/labels`, token, {
        method: 'POST',
        body: JSON.stringify({
          labels: ['blog-submission', ...(isUpdate ? ['post-update'] : [])],
        }),
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
