import { createReactBlockSpec } from '@blocknote/react';
import { COMPONENT_NAME_RE } from '../../serialize/validate';

export const createComponentBlock = createReactBlockSpec(
  {
    type: 'customComponent',
    propSchema: {
      componentName: { default: '' },
      source: { default: '' },
      frameTitle: { default: '' },
      frameSize: { default: 'normal', values: ['normal', 'wide'] },
      frameExpand: { default: false },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });
      const name = block.props.componentName;
      const badName = name !== '' && !COMPONENT_NAME_RE.test(name);

      return (
        <div className="write-component" contentEditable={false}>
          <span className="write-block-label">Custom React component</span>
          <input
            type="text"
            className={badName ? 'write-input-invalid' : undefined}
            placeholder="Component name, e.g. ThroughputViz"
            value={name}
            onChange={(e) => setProps({ componentName: e.target.value })}
          />
          {badName && (
            <span className="write-block-error">
              Use PascalCase: letters and digits, starting with a capital letter.
            </span>
          )}
          <textarea
            rows={8}
            spellCheck={false}
            placeholder={'export default function ThroughputViz() {\n  return <div>…</div>;\n}'}
            value={block.props.source}
            onChange={(e) => setProps({ source: e.target.value })}
          />
          <div className="write-component-frame">
            <select
              value={block.props.frameSize}
              onChange={(e) => setProps({ frameSize: e.target.value as 'normal' | 'wide' })}
              aria-label="Display width"
            >
              <option value="normal">Normal width</option>
              <option value="wide">Wide — extends past the text column</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={block.props.frameExpand}
                onChange={(e) => setProps({ frameExpand: e.target.checked })}
              />
              Expand button
            </label>
            <input
              type="text"
              placeholder="Frame title (optional)"
              value={block.props.frameTitle}
              onChange={(e) => setProps({ frameTitle: e.target.value })}
            />
          </div>
        </div>
      );
    },
  },
);
