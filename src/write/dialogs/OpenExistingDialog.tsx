import { useRef } from 'react';
import { useDialogFocus } from '../lib/useDialogFocus';

type Props = {
  open: boolean;
  busy: boolean;
  url: string;
  error: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function OpenExistingDialog({
  open,
  busy,
  url,
  error,
  onUrlChange,
  onSubmit,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panelRef, onClose, !busy);
  if (!open) return null;
  return (
    <div className="write-modal-backdrop" onClick={() => !busy && onClose()} role="presentation">
      <div
        ref={panelRef}
        className="write-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit a published post"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Edit a published post</h3>
        <p>Paste the post’s URL.</p>
        <input
          type="text"
          className="write-open-url"
          placeholder="https://mlsystems.dev/blog/…"
          aria-label="Post URL"
          autoFocus
          value={url}
          disabled={busy}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        {error && <p className="write-modal-error">{error}</p>}
        <div className="write-modal-actions">
          <button type="button" className="write-ghost" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="write-download"
            disabled={busy || !url.trim()}
            onClick={onSubmit}
          >
            {busy ? 'Loading…' : 'Open post'}
          </button>
        </div>
      </div>
    </div>
  );
}
