import { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { addAsset, getAssetUrl, removeAsset } from '../../storage/assets';
import { optimizeImage } from '../../storage/optimizeImage';

// preview is a relative width so sizes stay distinct in the narrow editor column.
const SIZES: { key: string; label: string; width: number; preview: string }[] = [
  { key: 'small', label: 'Small', width: 360, preview: '55%' },
  { key: 'medium', label: 'Medium', width: 620, preview: '78%' },
  { key: 'large', label: 'Large', width: 960, preview: '100%' },
];

function sizeFor(width: string | number) {
  const n = Number(width);
  return SIZES.find((s) => s.width === n) ?? SIZES[0];
}

export const createFigureBlock = createReactBlockSpec(
  {
    type: 'figure',
    propSchema: {
      fileName: { default: '' },
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      width: { default: 360 },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [url, setUrl] = useState('');
      const [error, setError] = useState(false);
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });

      const addUrl = () => {
        const u = url.trim();
        if (/^https?:\/\/\S+/i.test(u) || u.startsWith('data:image/')) setProps({ src: u });
        else setError(true);
      };

      const hasImage = block.props.fileName || block.props.src;

      if (!hasImage) {
        return (
          <div className="write-block-form" contentEditable={false}>
            <span className="write-block-label">Image — upload a file or paste a URL</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setProps({ fileName: addAsset(await optimizeImage(file)) });
              }}
            />
            <div className="write-block-row" style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="…or paste an image URL (https://…)"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) {
                    e.preventDefault();
                    addUrl();
                  }
                }}
              />
              <button type="button" onClick={addUrl}>
                Add
              </button>
            </div>
            {error && (
              <span className="write-block-error">
                That doesn’t look like an image URL — it should start with https://.
              </span>
            )}
          </div>
        );
      }

      const previewSrc = block.props.fileName ? getAssetUrl(block.props.fileName) : block.props.src;
      const active = sizeFor(block.props.width);

      return (
        <figure className="write-figure" contentEditable={false}>
          <div className="write-figure-frame">
            <img src={previewSrc} alt={block.props.alt} style={{ width: active.preview }} />
            <button
              type="button"
              className="write-remove"
              aria-label="Remove image"
              title="Remove image"
              onClick={() => {
                if (block.props.fileName) removeAsset(block.props.fileName);
                setProps({ fileName: '', src: '' });
              }}
            >
              <span aria-hidden="true">✕</span>
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
                className={active.key === s.key ? 'write-chip is-active' : 'write-chip'}
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
