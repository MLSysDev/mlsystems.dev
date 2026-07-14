import { useState, useRef } from 'react';
import type { NewAuthor } from '../serialize/toMdx';
import { slugify } from '../serialize/validate';
import { useDialogFocus } from '../lib/useDialogFocus';

type Props = {
  existingHandles: string[];
  initial: NewAuthor | null;
  onSave: (author: NewAuthor) => void;
  onRemove?: () => void;
  onCancel: () => void;
};

const LINKS: { key: keyof NewAuthor; label: string; placeholder: string }[] = [
  { key: 'website', label: 'Website', placeholder: 'https://…' },
  { key: 'github', label: 'GitHub', placeholder: 'username' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'profile URL' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
];

export function AuthorModal({ existingHandles, initial, onSave, onRemove, onCancel }: Props) {
  const [form, setForm] = useState<NewAuthor>(
    initial ?? {
      handle: '',
      name: '',
      bio: '',
      website: '',
      github: '',
      twitter: '',
      linkedin: '',
      email: '',
    },
  );
  const [handleTouched, setHandleTouched] = useState(!!initial);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(true, panelRef, onCancel);

  const set = (patch: Partial<NewAuthor>) => setForm((f) => ({ ...f, ...patch }));

  const handle = form.handle.trim();
  const taken = handle !== '' && handle !== initial?.handle && existingHandles.includes(handle);

  const save = () => {
    const name = form.name.trim();
    if (!name) return setError('Please add your name.');
    if (!handle) return setError('Please pick a handle.');
    if (!/^[a-z0-9-]+$/.test(handle))
      return setError('Handle can use lowercase letters, numbers and hyphens only.');
    if (taken) return setError('That handle is already taken — pick another.');
    onSave({ ...form, name, handle });
  };

  return (
    <div className="write-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        ref={panelRef}
        className="write-modal write-author-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Join as author"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Join as an author</h3>
        <p>
          Fill in what you want shown on your author page. Anything you skip simply won’t appear.
        </p>

        <label className="write-author-field">
          Name
          <input
            type="text"
            value={form.name}
            placeholder="Your display name"
            onChange={(e) =>
              set({
                name: e.target.value,
                ...(handleTouched ? {} : { handle: slugify(e.target.value) }),
              })
            }
          />
        </label>

        <label className="write-author-field">
          Handle
          <input
            type="text"
            value={form.handle}
            placeholder="e.g. jane-doe"
            onChange={(e) => {
              setHandleTouched(true);
              set({ handle: e.target.value.toLowerCase() });
            }}
          />
          <span className="write-author-hint">
            {taken ? 'Taken — pick another.' : 'Used for your profile URL.'}
          </span>
        </label>

        <label className="write-author-field">
          Short bio
          <textarea
            rows={3}
            value={form.bio}
            placeholder="A sentence or two about what you work on."
            onChange={(e) => set({ bio: e.target.value })}
          />
        </label>

        <div className="write-author-links">
          {LINKS.map(({ key, label, placeholder }) => (
            <label key={key} className="write-author-field">
              {label}
              <input
                type="text"
                value={(form[key] as string) ?? ''}
                placeholder={placeholder}
                onChange={(e) => set({ [key]: e.target.value } as Partial<NewAuthor>)}
              />
            </label>
          ))}
        </div>

        {error && (
          <p className="write-modal-error" role="alert">
            {error}
          </p>
        )}

        <div className="write-modal-actions">
          {onRemove && (
            <button type="button" className="write-ghost write-author-remove" onClick={onRemove}>
              Remove
            </button>
          )}
          <button type="button" className="write-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="write-download" onClick={save}>
            Save author
          </button>
        </div>
      </div>
    </div>
  );
}
