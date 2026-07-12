import { createReactBlockSpec } from '@blocknote/react';
import { addAsset, getAssetUrl, removeAsset } from '../../storage/assets';

export const createFigureBlock = createReactBlockSpec(
  {
    type: 'figure',
    propSchema: {
      fileName: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      width: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });

      if (!block.props.fileName) {
        return (
          <div className="write-block-form" contentEditable={false}>
            <span className="write-block-label">Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setProps({ fileName: addAsset(file) });
              }}
            />
          </div>
        );
      }

      return (
        <figure className="write-figure" contentEditable={false}>
          <div className="write-figure-frame">
            <img src={getAssetUrl(block.props.fileName)} alt={block.props.alt} />
            <button
              type="button"
              className="write-remove"
              title="Remove image"
              onClick={() => {
                removeAsset(block.props.fileName);
                setProps({ fileName: '' });
              }}
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            className="write-alt-input"
            placeholder="Alt text (required) — describe the image for screen readers"
            value={block.props.alt}
            onChange={(e) => setProps({ alt: e.target.value })}
          />
          <input
            type="text"
            className="write-caption-input"
            placeholder="Caption (optional)"
            value={block.props.caption}
            onChange={(e) => setProps({ caption: e.target.value })}
          />
          <label className="write-width-row">
            Display width
            <select value={block.props.width} onChange={(e) => setProps({ width: e.target.value })}>
              <option value="">Default</option>
              <option value="740">Text width</option>
              <option value="900">Wide</option>
            </select>
          </label>
        </figure>
      );
    },
  },
);
