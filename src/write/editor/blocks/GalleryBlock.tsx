import { createReactBlockSpec } from '@blocknote/react';
import { addAsset, getAssetUrl, removeAsset } from '../../storage/assets';
import { optimizeImage } from '../../storage/optimizeImage';

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const createGalleryBlock = createReactBlockSpec(
  {
    type: 'gallery',
    propSchema: {
      fileNames: { default: '[]' },
      alts: { default: '[]' },
      min: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const fileNames = parseList(block.props.fileNames);
      const alts = parseList(block.props.alts);
      const update = (names: string[], newAlts: string[]) =>
        editor.updateBlock(block, {
          props: {
            ...block.props,
            fileNames: JSON.stringify(names),
            alts: JSON.stringify(newAlts),
          },
        });

      return (
        <div className="write-gallery" contentEditable={false}>
          <span className="write-block-label">Gallery — images share a row</span>
          <div className="write-gallery-grid">
            {fileNames.map((name, i) => (
              <div key={name} className="write-gallery-item">
                <div className="write-figure-frame">
                  <img src={getAssetUrl(name)} alt={alts[i] ?? ''} />
                  <button
                    type="button"
                    className="write-remove"
                    aria-label={`Remove image ${i + 1}`}
                    title="Remove image"
                    onClick={() => {
                      removeAsset(name);
                      update(
                        fileNames.filter((_, j) => j !== i),
                        alts.filter((_, j) => j !== i),
                      );
                    }}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
                <input
                  type="text"
                  className="write-alt-input"
                  placeholder="Alt text (required)"
                  value={alts[i] ?? ''}
                  onChange={(e) => {
                    const next = [...alts];
                    next[i] = e.target.value;
                    update(fileNames, next);
                  }}
                />
              </div>
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              if (files.length === 0) return;
              const optimized = await Promise.all(files.map(optimizeImage));
              const added = optimized.map((f) => addAsset(f));
              update([...fileNames, ...added], [...alts, ...added.map(() => '')]);
            }}
          />
        </div>
      );
    },
  },
);
