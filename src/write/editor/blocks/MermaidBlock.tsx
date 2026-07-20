import { useEffect, useRef, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import mermaid from 'mermaid';
import { sanitizeSvg } from '../../lib/sanitizeSvg';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'neutral',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  // Top-level htmlLabels is required: the flowchart-scoped flag alone still
  // emits foreignObject labels, which the SVG sanitizer strips.
  htmlLabels: false,
  flowchart: { htmlLabels: false },
});

let renderSeq = 0;

export const createMermaidBlock = createReactBlockSpec(
  {
    type: 'mermaid',
    propSchema: {
      source: { default: '' },
      svg: { default: '' },
      caption: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });
      const [mode, setMode] = useState<'edit' | 'preview'>(block.props.svg ? 'preview' : 'edit');
      const [error, setError] = useState('');
      const latest = useRef(0);

      useEffect(() => {
        const src = block.props.source.trim();
        if (!src) {
          setError('');
          if (block.props.svg) setProps({ svg: '' });
          return;
        }
        const ticket = ++latest.current;
        const timer = setTimeout(async () => {
          try {
            const { svg } = await mermaid.render(`mmd-${++renderSeq}`, src);
            if (latest.current !== ticket) return;
            setError('');
            if (svg !== block.props.svg) setProps({ svg });
          } catch (e) {
            if (latest.current !== ticket) return;
            setError(e instanceof Error ? e.message : String(e));
          }
        }, 400);
        return () => clearTimeout(timer);
      }, [block.props.source]);

      const hasSvg = Boolean(block.props.svg) && !error;

      return (
        <figure className="write-svg" contentEditable={false}>
          <div className="write-svg-bar">
            <div className="write-svg-switch" role="tablist" aria-label="Mermaid view">
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
          </div>

          {mode === 'edit' || !hasSvg ? (
            <div className="write-block-form">
              <span className="write-block-label">
                Mermaid source — renders as a static SVG on the published page
              </span>
              <textarea
                rows={6}
                className="write-svg-code"
                placeholder={'flowchart LR\n  A[Input] --> B[Model]\n  B --> C[Output]'}
                value={block.props.source}
                onChange={(e) => setProps({ source: e.target.value })}
                onBlur={() => {
                  if (block.props.svg && !error) setMode('preview');
                }}
              />
              {error && <span className="write-block-error">{error.split('\n')[0]}</span>}
            </div>
          ) : (
            <div
              className="write-svg-preview write-mermaid-preview"
              onDoubleClick={() => setMode('edit')}
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(block.props.svg) }}
            />
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
