import { useState } from 'react';
import type { PostMeta } from '../serialize/toMdx';
import { slugify } from '../serialize/validate';

export type Option = { id: string; name: string };

type Props = {
  authors: Option[];
  topics: Option[];
  meta: PostMeta;
  onChange: (meta: PostMeta) => void;
};

export function MetaForm({ authors, topics, meta, onChange }: Props) {
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const set = (patch: Partial<PostMeta>) => onChange({ ...meta, ...patch });

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !meta.tags.includes(tag)) set({ tags: [...meta.tags, tag] });
    setTagInput('');
  };

  return (
    <div className="write-meta">
      <input
        type="text"
        className="write-title"
        placeholder="Title"
        value={meta.title}
        onChange={(e) =>
          set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })
        }
      />
      <textarea
        className="write-summary"
        rows={2}
        placeholder="A one-sentence summary — shows under the title and on social cards"
        value={meta.summary}
        onChange={(e) => set({ summary: e.target.value })}
      />

      <div className="write-meta-row">
        <label>
          Author
          <select value={meta.author} onChange={(e) => set({ author: e.target.value })}>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (@{a.id})
              </option>
            ))}
          </select>
        </label>
        {meta.author === 'guest' && (
          <label>
            Your name
            <input
              type="text"
              placeholder="So we know who wrote it"
              value={meta.writerName}
              onChange={(e) => set({ writerName: e.target.value })}
            />
          </label>
        )}
        <label>
          Topic
          <select
            value={meta.topicId}
            onChange={(e) => {
              const topic = topics.find((t) => t.id === e.target.value);
              set({ topicId: topic?.id ?? '', topicName: topic?.name ?? '' });
            }}
          >
            <option value="">Pick a topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="write-meta-row">
        <label>
          URL slug
          <input
            type="text"
            value={meta.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value });
            }}
          />
        </label>
        <label className="write-tags">
          Tags
          <span className="write-tags-box">
            {meta.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="write-tag"
                title="Remove tag"
                onClick={() => set({ tags: meta.tags.filter((t) => t !== tag) })}
              >
                #{tag} ✕
              </button>
            ))}
            <input
              type="text"
              placeholder={meta.tags.length ? '' : 'attention, kernels…'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
