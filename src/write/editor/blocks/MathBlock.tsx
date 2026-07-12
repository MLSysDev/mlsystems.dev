import { useMemo, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import katex from 'katex';

export const createMathBlock = createReactBlockSpec(
  {
    type: 'math',
    propSchema: {
      latex: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [editing, setEditing] = useState(!block.props.latex);
      const html = useMemo(
        () =>
          block.props.latex
            ? katex.renderToString(block.props.latex, { displayMode: true, throwOnError: false })
            : '',
        [block.props.latex],
      );

      return (
        <div className="write-math" contentEditable={false}>
          {editing ? (
            <div className="write-block-form">
              <span className="write-block-label">LaTeX equation</span>
              <textarea
                autoFocus
                rows={2}
                placeholder={'\\text{Attention}(Q, K, V) = \\text{softmax}(QK^T / \\sqrt{d_k})V'}
                value={block.props.latex}
                onChange={(e) =>
                  editor.updateBlock(block, { props: { ...block.props, latex: e.target.value } })
                }
                onBlur={() => {
                  if (block.props.latex) setEditing(false);
                }}
              />
              {html && (
                <div className="write-math-preview" dangerouslySetInnerHTML={{ __html: html }} />
              )}
            </div>
          ) : (
            <button
              type="button"
              className="write-math-rendered"
              title="Click to edit"
              onClick={() => setEditing(true)}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      );
    },
  },
);
