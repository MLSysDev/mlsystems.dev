import { BlockNoteSchema } from '@blocknote/core';
import { createVideoBlock } from './blocks/VideoBlock';
import { createNoteBlock } from './blocks/NoteBlock';
import { createSeparatorBlock } from './blocks/SeparatorBlock';
import { createMathBlock } from './blocks/MathBlock';
import { createFigureBlock } from './blocks/FigureBlock';
import { createGalleryBlock } from './blocks/GalleryBlock';
import { createComponentBlock } from './blocks/ComponentBlock';

export const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    video: createVideoBlock(),
    note: createNoteBlock(),
    separator: createSeparatorBlock(),
    math: createMathBlock(),
    figure: createFigureBlock(),
    gallery: createGalleryBlock(),
    customComponent: createComponentBlock(),
  },
});

export type WriteEditor = typeof schema.BlockNoteEditor;
