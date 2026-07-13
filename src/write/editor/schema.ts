import { BlockNoteSchema, createCodeBlockSpec } from '@blocknote/core';
import { codeBlockOptions } from '@blocknote/code-block';
import { createVideoBlock } from './blocks/VideoBlock';
import { createNoteBlock } from './blocks/NoteBlock';
import { createSeparatorBlock } from './blocks/SeparatorBlock';
import { createMathBlock } from './blocks/MathBlock';
import { createFigureBlock } from './blocks/FigureBlock';
import { createGalleryBlock } from './blocks/GalleryBlock';
import { createComponentBlock } from './blocks/ComponentBlock';
import { createSvgBlock } from './blocks/SvgBlock';

export const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec(codeBlockOptions),
    video: createVideoBlock(),
    note: createNoteBlock(),
    separator: createSeparatorBlock(),
    math: createMathBlock(),
    figure: createFigureBlock(),
    gallery: createGalleryBlock(),
    customComponent: createComponentBlock(),
    svg: createSvgBlock(),
  },
});

export type WriteEditor = typeof schema.BlockNoteEditor;
