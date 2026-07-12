import { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';

export function parseYouTubeId(input: string): string {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : '';
}

export const createVideoBlock = createReactBlockSpec(
  {
    type: 'video',
    propSchema: {
      videoId: { default: '' },
      caption: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [url, setUrl] = useState('');
      const [error, setError] = useState(false);
      const setProps = (patch: Partial<typeof block.props>) =>
        editor.updateBlock(block, { props: { ...block.props, ...patch } });

      if (!block.props.videoId) {
        return (
          <div className="write-block-form" contentEditable={false}>
            <span className="write-block-label">YouTube video</span>
            <div className="write-block-row">
              <input
                type="text"
                placeholder="Paste a YouTube link…"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const id = parseYouTubeId(url);
                    if (id) setProps({ videoId: id });
                    else setError(true);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const id = parseYouTubeId(url);
                  if (id) setProps({ videoId: id });
                  else setError(true);
                }}
              >
                Add
              </button>
            </div>
            {error && (
              <span className="write-block-error">That doesn’t look like a YouTube link.</span>
            )}
          </div>
        );
      }

      return (
        <figure className="write-video" contentEditable={false}>
          <div className="write-video-thumb">
            <img src={`https://i.ytimg.com/vi/${block.props.videoId}/hqdefault.jpg`} alt="" />
            <span className="write-video-badge">▶ YouTube</span>
          </div>
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
