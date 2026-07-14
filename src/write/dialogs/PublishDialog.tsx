export type PublishStage = 'idle' | 'working' | 'done' | 'error';

type Props = {
  open: boolean;
  stage: PublishStage;
  error: string | null;
  prUrl: string | null;
  onSubmit: () => void;
  onClose: () => void;
};

export function PublishDialog({ open, stage, error, prUrl, onSubmit, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="write-modal-backdrop"
      onClick={() => stage !== 'working' && onClose()}
      role="presentation"
    >
      <div
        className="write-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Post to GitHub"
        onClick={(e) => e.stopPropagation()}
      >
        {stage === 'done' ? (
          <>
            <h3>
              Your post has been submitted{' '}
              <span className="write-celebrate" aria-hidden="true">
                🎉
              </span>
            </h3>
            <p>
              Open the request and comment to claim it — that&rsquo;s how a maintainer knows
              it&rsquo;s yours.
            </p>
            <div className="write-modal-actions">
              {prUrl && (
                <a className="write-download" href={prUrl} target="_blank" rel="noreferrer">
                  Open my request →
                </a>
              )}
            </div>
          </>
        ) : stage === 'working' ? (
          <>
            <h3>Opening your request…</h3>
            <div className="write-modal-loading">
              <span className="write-spinner" aria-hidden="true" />
              <p>Creating your pull request on GitHub. This only takes a moment.</p>
            </div>
          </>
        ) : (
          <>
            <h3>Ready to post?</h3>
            <p>
              We’ll submit your article via GitHub. Once it’s created, please add your name on the
              request to claim it — Admin will take it from there.
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
              <button type="button" className="write-download" onClick={onSubmit}>
                Create pull request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
