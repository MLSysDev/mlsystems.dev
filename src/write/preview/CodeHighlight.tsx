import { useEffect, useState } from 'react';

// Same highlighter + theme the published page uses (shikiConfig: github-dark),
// loaded on demand so it only ships when the preview shows a code block.
export default function CodeHighlight({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let alive = true;
    setHtml('');
    import('shiki')
      .then(({ codeToHtml }) => codeToHtml(code, { lang: lang || 'text', theme: 'github-dark' }))
      .then((h) => {
        if (alive) setHtml(h);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [code, lang]);

  if (!html) {
    return (
      <pre className="write-preview-code">
        <code>{code}</code>
      </pre>
    );
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
