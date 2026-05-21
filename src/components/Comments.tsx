'use client';

import { useEffect, useRef } from 'react';

// To enable comments:
//   1. Make the repo public + enable GitHub Discussions.
//   2. Install the giscus app: https://github.com/apps/giscus
//   3. Visit https://giscus.app, fill in MLSysDev/mlsystems.dev + the "Comments"
//      category, and paste the resulting IDs into the two PUBLIC_* env vars.
// If either ID is missing, this component renders a graceful "not configured"
// note instead of breaking the page.
const REPO = 'MLSysDev/mlsystems.dev';
const REPO_ID = import.meta.env.PUBLIC_GISCUS_REPO_ID as string | undefined;
const CATEGORY = 'Comments';
const CATEGORY_ID = import.meta.env.PUBLIC_GISCUS_CATEGORY_ID as string | undefined;

export default function Comments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !REPO_ID || !CATEGORY_ID) return;
    if (ref.current.querySelector('script[data-giscus]')) return;

    const theme =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark_dimmed' : 'light';

    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.dataset.giscus = 'true';
    s.dataset.repo = REPO;
    s.dataset.repoId = REPO_ID;
    s.dataset.category = CATEGORY;
    s.dataset.categoryId = CATEGORY_ID;
    s.dataset.mapping = 'pathname';
    s.dataset.strict = '0';
    s.dataset.reactionsEnabled = '1';
    s.dataset.emitMetadata = '0';
    s.dataset.inputPosition = 'top';
    s.dataset.theme = theme;
    s.dataset.lang = 'en';
    s.dataset.loading = 'lazy';
    ref.current.appendChild(s);
  }, []);

  if (!REPO_ID || !CATEGORY_ID) {
    return (
      <section className="comments">
        <h3>Discussion</h3>
        <div
          style={{
            padding: 20,
            border: '1px dashed var(--line-2)',
            borderRadius: 8,
            fontSize: 14,
            color: 'var(--ink-3)',
            lineHeight: 1.55,
          }}
        >
          Comments are powered by{' '}
          <a
            href="https://giscus.app"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            Giscus
          </a>{' '}
          on top of GitHub Discussions. Once configured, every reply lives in the public{' '}
          <a
            href="https://github.com/orgs/MLSysDev/discussions"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            MLSysDev/mlsystems.dev
          </a>{' '}
          discussion for this article.
        </div>
      </section>
    );
  }

  return (
    <section className="comments">
      <h3>Discussion</h3>
      <div ref={ref} />
    </section>
  );
}
