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

function getGiscusTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'noborder_dark'
    : 'noborder_light';
}

function sendGiscusTheme(theme: string) {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
}

export default function Comments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !REPO_ID || !CATEGORY_ID) return;
    if (ref.current.querySelector('script[data-giscus]')) return;

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
    s.dataset.theme = getGiscusTheme();
    s.dataset.lang = 'en';
    s.dataset.loading = 'lazy';
    ref.current.appendChild(s);

    const observer = new MutationObserver(() => sendGiscusTheme(getGiscusTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  if (!REPO_ID || !CATEGORY_ID) {
    return (
      <section className="comments">
        <div className="comments-header">
          <span className="comments-label">Discussion</span>
          <span className="comments-meta">via GitHub Discussions</span>
        </div>
        <p className="comments-unconfigured">
          Comments are powered by{' '}
          <a href="https://giscus.app" target="_blank" rel="noreferrer">
            Giscus
          </a>
          . Once configured, replies live in{' '}
          <a
            href="https://github.com/MLSysDev/mlsystems.dev/discussions"
            target="_blank"
            rel="noreferrer"
          >
            MLSysDev/mlsystems.dev
          </a>{' '}
          discussions.
        </p>
      </section>
    );
  }

  return (
    <section className="comments">
      <div className="comments-header">
        <span className="comments-label">Discussion</span>
        <span className="comments-meta">via GitHub Discussions</span>
      </div>
      <div ref={ref} />
    </section>
  );
}
