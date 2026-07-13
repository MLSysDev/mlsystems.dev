// Cloudflare Pages Function: opens a pull request on the repo directly, as our
// installed GitHub App. No user login and no forks — the client sends the post
// files, we authenticate as the App (private key in env) and create the branch,
// commit, and PR. The App's short-lived installation token never leaves here.

type Env = {
  GH_APP_ID?: string;
  GH_APP_INSTALLATION_ID?: string;
  GH_APP_PRIVATE_KEY?: string;
  GH_REPO?: string;
  ALLOWED_ORIGIN?: string;
};

type PostFile = { path: string; content: string; encoding: 'utf-8' | 'base64' };

const DEFAULT_REPO = 'MLSysDev/mlsystems.dev';
const DEFAULT_ORIGIN = 'https://mlsystems.dev';
const CONTACT_EMAIL = 'admin@mlsystems.dev';
const UA = 'mlsystems-write';

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

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  const allowed = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
  const origin = request.headers.get('origin');
  if (origin && origin !== allowed) return json({ error: 'Forbidden origin.' }, 403);

  if (!env.GH_APP_ID || !env.GH_APP_INSTALLATION_ID || !env.GH_APP_PRIVATE_KEY) {
    return json({ error: 'Publishing is not configured on the server yet.' }, 500);
  }

  let payload: { title?: string; slug?: string; files?: PostFile[]; isEdit?: boolean };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const slug = (payload.slug ?? '').trim();
  const title = (payload.title ?? '').trim() || slug;
  const files = payload.files ?? [];
  const isEdit = payload.isEdit === true;
  if (!slug || files.length === 0) return json({ error: 'Missing post data.' }, 400);

  const [owner, name] = (env.GH_REPO || DEFAULT_REPO).split('/');

  try {
    const jwt = await appJwt(env.GH_APP_ID, env.GH_APP_PRIVATE_KEY);
    const inst = (await gh(`/app/installations/${env.GH_APP_INSTALLATION_ID}/access_tokens`, jwt, {
      method: 'POST',
    })) as { token: string };
    const token = inst.token;

    // A brand-new post must not silently overwrite an existing one at the same slug.
    // Edits (loaded via the portal's "Open existing post") are meant to, so skip then.
    if (!isEdit) {
      const existing = await fetch(
        `https://api.github.com/repos/${owner}/${name}/contents/${encodeURI(
          `src/content/posts/${slug}/index.mdx`,
        )}?ref=main`,
        {
          headers: {
            accept: 'application/vnd.github+json',
            authorization: `Bearer ${token}`,
            'user-agent': UA,
            'x-github-api-version': '2022-11-28',
          },
        },
      );
      if (existing.ok) {
        return json(
          { error: 'A post with this URL already exists. Change the URL slug and try again.' },
          409,
        );
      }
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
        message: `Add post: ${title}`,
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

    const body = [
      '```',
      '╭──────────────────────────────────────────╮',
      '│  NEW BLOG POST  ·  mlsystems.dev /write   │',
      '╰──────────────────────────────────────────╯',
      '```',
      '',
      `## ${title}`,
      '',
      'Opened automatically from the mlsystems.dev **/write** portal.',
      '',
      '### Preview it',
      "Once the Cloudflare check below finishes, a link to your post's preview page is posted here as a comment. Open it to see how the post will look once published.",
      '',
      '> [!IMPORTANT]',
      '> **Please comment below to claim this post.** Commenting from your GitHub account already',
      '> tells us who you are — just say which **author name** it should be published under.',
      '>',
      `> Prefer not to comment here? Email this page's link to **${CONTACT_EMAIL}** instead.`,
      '',
      '> [!NOTE]',
      '> **Posting for the first time?** Also include your author details so we can set up your profile:',
      '> - Short bio (1–2 sentences)',
      '> - Links to show on your profile: website, GitHub, X/Twitter, LinkedIn',
      '> - _(optional)_ an email, if you want one shown',
      '',
      '### Need to change something?',
      'Just edit in the /write portal and submit again — it opens a fresh request. No need to touch this one.',
      '',
      `<!-- post-slug: ${slug} -->`,
    ].join('\n');

    const pr = (await gh(`/repos/${owner}/${name}/pulls`, token, {
      method: 'POST',
      body: JSON.stringify({ title: `New post: ${title}`, head: branch, base: 'main', body }),
    })) as { html_url: string; number: number };

    // Best-effort label for triage. Needs Issues: write on the App + the label to
    // exist; ignore failures so a missing permission never blocks the submission.
    try {
      await gh(`/repos/${owner}/${name}/issues/${pr.number}/labels`, token, {
        method: 'POST',
        body: JSON.stringify({ labels: ['blog-submission'] }),
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
