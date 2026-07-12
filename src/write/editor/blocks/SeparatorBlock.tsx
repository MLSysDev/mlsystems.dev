import { createReactBlockSpec } from '@blocknote/react';

export const createSeparatorBlock = createReactBlockSpec(
  {
    type: 'separator',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => (
      <div className="write-separator" contentEditable={false}>
        · · ·
      </div>
    ),
  },
);
