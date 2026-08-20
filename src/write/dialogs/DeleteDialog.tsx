import { useRef } from 'react';
import { useDialogFocus } from '../lib/useDialogFocus';

export type DeleteStage = 'idle' | 'working' | 'done' | 'error';

type Props = {
  open: boolean;
  stage: DeleteStage;
  error: string | null;
  prUrl: string | null;
  title: string;
  onSubmit: () => void;
  onClose: () => void;
};

export function DeleteDialog({ open, stage, error, prUrl, title, onSubmit, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panelRef, onClose, stage !== 'working');
  if (!open) return null;

  return (
    <div
      className="write-modal-backdrop"
      onClick={() => stage !== 'working' && onClose()}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="write-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Delete this post"
        onClick={(e) => e.stopPropagation()}
      >
        {stage === 'done' ? (
          <>
            <h3>Pull request opened</h3>
            <p>Merge it and the post comes down. Close it instead and nothing changes.</p>
            <div className="write-modal-actions">
              {prUrl && (
                <a className="write-download" href={prUrl} target="_blank" rel="noreferrer">
                  Open the pull request →
                </a>
              )}
            </div>
          </>
        ) : stage === 'working' ? (
          <>
            <h3>Opening the pull request…</h3>
            <div className="write-modal-loading">
              <span className="write-spinner" aria-hidden="true" />
              <p>Removing the post's files on a new branch.</p>
            </div>
          </>
        ) : (
          <>
            <h3>Delete this post?</h3>
            <p>
              Delete &ldquo;{title}&rdquo; — this creates a delete request, and it&rsquo;ll be
              deleted once approved.
            </p>
            {error && (
              <p className="write-modal-error" role="alert">
                {error}
              </p>
            )}
            <div className="write-modal-actions">
              <button type="button" className="write-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="write-danger-btn" onClick={onSubmit}>
                Open delete request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
