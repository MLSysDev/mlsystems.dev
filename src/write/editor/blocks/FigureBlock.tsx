import { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { addAsset, getAssetUrl, removeAsset } from '../../storage/assets';

const SIZES: { key: string; label: string; width: number }[] = [
  { key: 'small', label: 'Small', width: 360 },
  { key: 'medium', label: 'Medium', width: 620 },
  { key: 'large', label: 'Large', width: 960 },
];

function widthToKey(width: string | number): string {
  const n = Number(width);
  const match = SIZES.find((s) => s.width === n);
  return match ? match.key : 'medium';
}

export const createFigureBlock = createReactBlockSpec(
  {
    type: 'figure',
    propSchema: {
      fileName: { default: '' },
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      width: { default: 620 },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [url, setUrl] = useState('');
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });

      const hasImage = block.props.fileName || block.props.src;

      if (!hasImage) {
        return (
          <div className="write-block-form" contentEditable={false}>
            <span className="write-block-label">Image — upload a file or paste a URL</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setProps({ fileName: addAsset(file) });
              }}
            />
            <div className="write-block-row" style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="…or paste an image URL (https://…)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) {
                    e.preventDefault();
                    setProps({ src: url.trim() });
                  }
                }}
              />
              <button type="button" onClick={() => url.trim() && setProps({ src: url.trim() })}>
                Add
              </button>
            </div>
          </div>
        );
      }

      const previewSrc = block.props.fileName ? getAssetUrl(block.props.fileName) : block.props.src;
      const activeKey = widthToKey(block.props.width);

      return (
        <figure className="write-figure" contentEditable={false}>
          <div className="write-figure-frame" style={{ maxWidth: `${block.props.width}px` }}>
            <img src={previewSrc} alt={block.props.alt} />
            <button
              type="button"
              className="write-remove"
              title="Remove image"
              onClick={() => {
                if (block.props.fileName) removeAsset(block.props.fileName);
                setProps({ fileName: '', src: '' });
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
          <div className="write-size-toggle">
            {SIZES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={activeKey === s.key ? 'write-chip is-active' : 'write-chip'}
                onClick={() => setProps({ width: s.width })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </figure>
      );
    },
  },
);
