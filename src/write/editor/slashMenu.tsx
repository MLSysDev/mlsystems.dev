import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import type { WriteEditor } from './schema';

const HIDDEN = ['image', 'video', 'audio', 'file', 'check list', 'toggle', 'emoji'];

export function getSlashItems(editor: WriteEditor) {
  const defaults = getDefaultReactSlashMenuItems(editor).filter(
    (item) => !HIDDEN.some((h) => item.title.toLowerCase().includes(h)),
  );

  const custom = [
    {
      title: 'Image',
      subtext: 'Upload an image with alt text and a caption',
      aliases: ['image', 'figure', 'photo', 'picture'],
      group: 'Media',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'figure' }),
    },
    {
      title: 'Gallery',
      subtext: 'Several images side by side',
      aliases: ['gallery', 'images', 'grid'],
      group: 'Media',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'gallery' }),
    },
    {
      title: 'Video',
      subtext: 'Embed a YouTube video',
      aliases: ['video', 'youtube', 'embed'],
      group: 'Media',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'video' }),
    },
    {
      title: 'Note',
      subtext: 'A callout the reader should not miss',
      aliases: ['note', 'callout', 'aside'],
      group: 'Basic blocks',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'note' }),
    },
    {
      title: 'Separator',
      subtext: 'A · · · section divider',
      aliases: ['separator', 'divider', 'hr', 'rule'],
      group: 'Basic blocks',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'separator' }),
    },
    {
      title: 'Math equation',
      subtext: 'A display equation written in LaTeX',
      aliases: ['math', 'latex', 'equation', 'katex'],
      group: 'Basic blocks',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'math' }),
    },
    {
      title: 'Custom component',
      subtext: 'Attach React code that renders after publish',
      aliases: ['component', 'react', 'tsx', 'advanced'],
      group: 'Advanced',
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'customComponent' }),
    },
  ];

  return [...defaults, ...custom];
}
