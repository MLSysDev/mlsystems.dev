import { createReactBlockSpec } from '@blocknote/react';
import { COMPONENT_NAME_RE } from '../../serialize/validate';

export const createComponentBlock = createReactBlockSpec(
  {
    type: 'customComponent',
    propSchema: {
      componentName: { default: '' },
      source: { default: '' },
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
          <span className="write-block-label">
            Custom React component — shows here as a placeholder, renders after publish
          </span>
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
          {name && !badName && block.props.source && (
            <div className="write-component-card">⚙ {name}.tsx — ships with your post folder</div>
          )}
        </div>
      );
    },
  },
);
