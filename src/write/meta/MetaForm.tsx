import { useLayoutEffect, useRef, useState } from 'react';
import { SITE } from '@/lib/site';
import type { NewAuthor, PostMeta } from '../serialize/toMdx';
import { slugify } from '../serialize/validate';
import { getAsset, getAssetUrl } from '../storage/assets';
import { AuthorModal } from './AuthorModal';
import { addCroppedCover } from './cropCover';

export type Option = { id: string; name: string };

type Props = {
  authors: Option[];
  topics: Option[];
  meta: PostMeta;
  images: string[];
  onChange: (meta: PostMeta) => void;
};

export function MetaForm({ authors, topics, meta, images, onChange }: Props) {
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [proposing, setProposing] = useState(!!meta.proposedTopic);
  const [authorModal, setAuthorModal] = useState(false);

  const set = (patch: Partial<PostMeta>) => onChange({ ...meta, ...patch });

  const saveNewAuthor = (author: NewAuthor) => {
    const kept = meta.authors.filter((id) => id !== meta.newAuthor?.handle);
    set({
      newAuthor: author,
      authors: kept.includes(author.handle) ? kept : [...kept, author.handle],
    });
    setAuthorModal(false);
  };

  const removeNewAuthor = () =>
    set({
      newAuthor: null,
      authors: meta.authors.filter((id) => id !== meta.newAuthor?.handle),
    });

  const slugLocked = slugTouched || (!!meta.slug && meta.slug !== slugify(meta.title));

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    for (const el of [titleRef.current, summaryRef.current]) {
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [meta.title, meta.summary]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !meta.tags.includes(tag)) set({ tags: [...meta.tags, tag] });
    setTagInput('');
  };

  return (
    <div className="write-meta">
      <textarea
        ref={titleRef}
        className="write-title"
        rows={1}
        placeholder="Title"
        aria-label="Post title"
        value={meta.title}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        onChange={(e) => {
          const title = e.target.value.replace(/\n/g, '');
          set({ title, ...(slugLocked ? {} : { slug: slugify(title) }) });
        }}
      />
      <textarea
        ref={summaryRef}
        className="write-summary"
        rows={1}
        placeholder="A brief summary of the blog — shows under the title"
        aria-label="Post summary"
        value={meta.summary}
        onChange={(e) => set({ summary: e.target.value })}
      />

      <div className="write-meta-row">
        <label>
          Authors
          <span className="write-authors">
            {meta.authors.map((id) => {
              const isNew = id === meta.newAuthor?.handle;
              const a = authors.find((x) => x.id === id);
              const label = isNew ? `${meta.newAuthor?.name} · new author` : a ? a.name : id;
              return (
                <button
                  key={id}
                  type="button"
                  className={isNew ? 'write-tag write-tag-new' : 'write-tag'}
                  title={isNew ? 'Edit or remove' : 'Remove author'}
                  onClick={() =>
                    isNew
                      ? setAuthorModal(true)
                      : set({ authors: meta.authors.filter((x) => x !== id) })
                  }
                >
                  {label} {isNew ? '✎' : '✕'}
                </button>
              );
            })}
            <select
              value=""
              aria-label="Add author"
              onChange={(e) => {
                if (e.target.value) set({ authors: [...meta.authors, e.target.value] });
              }}
            >
              <option value="">Add author…</option>
              {authors
                .filter((a) => !meta.authors.includes(a.id))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (@{a.id})
                  </option>
                ))}
            </select>
            {!meta.newAuthor && (
              <button
                type="button"
                className="write-author-add"
                onClick={() => setAuthorModal(true)}
              >
                ＋ Join as author
              </button>
            )}
          </span>
        </label>
        {meta.authors.includes('guest') && (
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
          <span>
            Topic <span className="write-optional">(optional)</span>
          </span>
          <select
            value={proposing ? '__propose__' : meta.topicId}
            onChange={(e) => {
              if (e.target.value === '__propose__') {
                setProposing(true);
                return;
              }
              const topic = topics.find((t) => t.id === e.target.value);
              setProposing(false);
              set({ topicId: topic?.id ?? '', topicName: topic?.name ?? '', proposedTopic: '' });
            }}
          >
            <option value="">No specific topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="__propose__">＋ Propose a new topic…</option>
          </select>
        </label>
      </div>

      {proposing && (
        <div className="write-meta-row">
          <label>
            New topic
            <input
              type="text"
              placeholder="e.g. Memory Systems"
              value={meta.proposedTopic ?? ''}
              onChange={(e) => set({ proposedTopic: e.target.value })}
            />
          </label>
          <label>
            File under for now
            <select
              value={meta.topicId}
              onChange={(e) => {
                const topic = topics.find((t) => t.id === e.target.value);
                set({ topicId: topic?.id ?? '', topicName: topic?.name ?? '' });
              }}
            >
              <option value="">Pick the closest…</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

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

      <div className="write-cover">
        {meta.coverFileName ? (
          <div className="write-cover-set">
            <div className="write-cover-holder">
              <div className="write-cover-frame">
                <img src={getAssetUrl(meta.coverFileName)} alt="" />
              </div>
              <button
                type="button"
                className="write-cover-remove"
                title="Remove cover"
                aria-label="Remove cover"
                onClick={() => set({ coverFileName: '' })}
              >
                ✕
              </button>
            </div>
            <span className="write-cover-tip">Recommended: wide, landscape (1200×630)</span>
            {SITE.ogCardOptIn && (
              <label
                className="write-ogcard-opt"
                title="Overlays your post title + brand on the cover for link previews (LinkedIn, X, Slack). Generated when you publish."
              >
                <input
                  type="checkbox"
                  checked={!!meta.ogCard}
                  onChange={(e) => set({ ogCard: e.target.checked })}
                />
                Designed share card
              </label>
            )}
          </div>
        ) : (
          <div className="write-cover-pick">
            {images.map((name) => (
              <button
                key={name}
                type="button"
                className="write-cover-thumb"
                title="Use as cover"
                onClick={async () => {
                  const file = getAsset(name);
                  if (file) set({ coverFileName: await addCroppedCover(file) });
                }}
              >
                <img src={getAssetUrl(name)} alt="" />
              </button>
            ))}
            <label className="write-cover-upload">
              Cover image
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) set({ coverFileName: await addCroppedCover(file) });
                }}
              />
            </label>
          </div>
        )}
      </div>

      {authorModal && (
        <AuthorModal
          existingHandles={authors.map((a) => a.id)}
          initial={meta.newAuthor ?? null}
          onSave={saveNewAuthor}
          onRemove={meta.newAuthor ? removeNewAuthor : undefined}
          onCancel={() => setAuthorModal(false)}
        />
      )}
    </div>
  );
}
