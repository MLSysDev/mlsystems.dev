import { useMemo, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { sanitizeSvg } from '../../lib/sanitizeSvg';

const looksLikeSvg = (s: string): boolean => /<svg[\s>]/i.test(s);

type Check =
  | { state: 'empty' }
  | { state: 'ok'; html: string }
  | { state: 'error'; message: string };

// Strict XML parsing mirrors what MDX/JSX needs to build (closed tags, quoted
// attrs, escaped &), so a preview that passes here won't break the published page.
function checkSvg(raw: string): Check {
  const code = sanitizeSvg(raw).trim();
  if (!code) return { state: 'empty' };
  if (!looksLikeSvg(code))
    return { state: 'error', message: 'The markup must contain an <svg> element.' };
  try {
    const doc = new DOMParser().parseFromString(code, 'image/svg+xml');
    const err = doc.querySelector('parsererror');
    if (err) {
      const detail = (err.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        state: 'error',
        message: detail || 'This isn’t valid SVG — check for unclosed tags.',
      };
    }
    if (doc.documentElement.tagName.toLowerCase() !== 'svg') {
      return { state: 'error', message: 'The markup must start with an <svg> element.' };
    }
    return { state: 'ok', html: code };
  } catch {
    return { state: 'error', message: 'This isn’t valid SVG markup.' };
  }
}

export const createSvgBlock = createReactBlockSpec(
  {
    type: 'svg',
    propSchema: {
      code: { default: '' },
      caption: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const hasSvg = looksLikeSvg(block.props.code);
      const check = useMemo(() => checkSvg(block.props.code), [block.props.code]);
      const [mode, setMode] = useState<'edit' | 'preview'>(hasSvg ? 'preview' : 'edit');
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });

      return (
        <figure className="write-svg" contentEditable={false}>
          <div className="write-svg-bar">
            <div className="write-svg-switch" role="tablist" aria-label="SVG view">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'preview'}
                className={mode === 'preview' ? 'is-active' : ''}
                disabled={!hasSvg}
                onClick={() => setMode('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'edit'}
                className={mode === 'edit' ? 'is-active' : ''}
                onClick={() => setMode('edit')}
              >
                Code
              </button>
            </div>
            {hasSvg && (
              <button
                type="button"
                className="write-svg-clear"
                title="Remove SVG"
                onClick={() => {
                  setProps({ code: '' });
                  setMode('edit');
                }}
              >
                Remove
              </button>
            )}
          </div>

          {mode === 'edit' ? (
            <div className="write-block-form">
              <span className="write-block-label">
                Paste SVG markup — use <code>currentColor</code> for strokes and fills so it adapts
                to light &amp; dark
              </span>
              <textarea
                autoFocus
                rows={6}
                className="write-svg-code"
                placeholder={'<svg viewBox="0 0 400 200" ...>\n  …\n</svg>'}
                value={block.props.code}
                onChange={(e) => setProps({ code: e.target.value })}
                onBlur={() => {
                  if (looksLikeSvg(block.props.code)) setMode('preview');
                }}
              />
            </div>
          ) : check.state === 'ok' ? (
            <div className="write-svg-preview" dangerouslySetInnerHTML={{ __html: check.html }} />
          ) : (
            <div className="write-svg-error">
              <strong>Can’t render this SVG.</strong>
              <span>
                {check.state === 'error' ? check.message : 'Paste some SVG markup first.'}
              </span>
              <button type="button" className="write-chip" onClick={() => setMode('edit')}>
                Fix the code
              </button>
            </div>
          )}

          <input
            type="text"
            className="write-caption-input"
            placeholder="Caption (optional)"
            value={block.props.caption}
            onChange={(e) => setProps({ caption: e.target.value })}
          />
        </figure>
      );
    },
  },
);
