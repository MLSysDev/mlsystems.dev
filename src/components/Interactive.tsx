import { useRef, type ReactNode } from 'react';

export default function Interactive({
  title,
  caption,
  size = 'normal',
  expand = false,
  children,
}: {
  title?: string;
  caption?: string;
  size?: 'normal' | 'wide';
  expand?: boolean;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const inlineSlotRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogSlotRef = useRef<HTMLDivElement>(null);

  const open = () => {
    if (!bodyRef.current || !dialogRef.current || !dialogSlotRef.current) return;
    dialogSlotRef.current.appendChild(bodyRef.current);
    dialogRef.current.showModal();
    document.documentElement.style.overflow = 'hidden';
  };

  // Fires for ✕ and Esc alike — the single restore point. The widget's DOM
  // node is moved, not re-rendered, so its React state survives the trip.
  const onClose = () => {
    if (bodyRef.current && inlineSlotRef.current) {
      inlineSlotRef.current.appendChild(bodyRef.current);
    }
    document.documentElement.style.overflow = '';
  };

  return (
    <div className={`ix ix--${size}`}>
      {(title || expand) && (
        <div className="ix-head">
          {title && <span className="ix-title">{title}</span>}
          {expand && (
            <button type="button" className="ix-expand" onClick={open} aria-label="Expand">
              ⤢
            </button>
          )}
        </div>
      )}
      <div ref={inlineSlotRef}>
        <div ref={bodyRef}>{children}</div>
      </div>
      {caption && <div className="inline-figure-caption">{caption}</div>}
      {expand && (
        <dialog
          ref={dialogRef}
          className="ix-dialog"
          onClose={onClose}
          onClick={(e) => {
            if (e.target === dialogRef.current) dialogRef.current?.close();
          }}
        >
          <div className="ix-dialog-head">
            <span className="ix-title">{title ?? 'Interactive'}</span>
            <button
              type="button"
              className="ix-expand"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div ref={dialogSlotRef} />
          {caption && <div className="inline-figure-caption">{caption}</div>}
        </dialog>
      )}
    </div>
  );
}
