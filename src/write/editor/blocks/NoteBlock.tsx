import { createReactBlockSpec } from '@blocknote/react';

export const createNoteBlock = createReactBlockSpec(
  {
    type: 'note',
    propSchema: {},
    content: 'inline',
  },
  {
    render: ({ contentRef }) => (
      <div className="write-note">
        <div className="write-note-label" contentEditable={false}>
          Note
        </div>
        <div ref={contentRef} />
      </div>
    ),
  },
);
