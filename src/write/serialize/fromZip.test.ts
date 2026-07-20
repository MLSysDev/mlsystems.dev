import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { readPostZip } from './fromZip';
import { buildSource } from './source';
import type { PostMeta } from './toMdx';

const meta: PostMeta = {
  title: 'Zip test',
  summary: 'A summary.',
  authors: ['dinesh'],
  writerName: '',
  topicId: 'training',
  topicName: 'Training',
  tags: [],
  slug: 'zip-test',
  coverFileName: '',
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

async function toFile(zip: JSZip): Promise<File> {
  const blob = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([blob], 'post.zip', { type: 'application/zip' });
}

const sourceJson = buildSource(
  meta,
  [{ id: 'p-1', type: 'paragraph', props: {}, content: [], children: [] }],
  {},
);

const MDX = `---
title: 'Zip test'
summary: 'A summary.'
authors: ['dinesh']
date: '2026-07-20'
topic: 'Training'
topicId: 'training'
tags: ['a']
---

import Widget from './Widget';

Hello $\\Delta W$ world.

<Widget client:visible />
`;

describe('readPostZip', () => {
  it('loads the write-source sidecar plus images', async () => {
    const zip = new JSZip();
    zip.file('zip-test/.write-source.json', sourceJson);
    zip.file('zip-test/index.mdx', '# ignored');
    zip.file('zip-test/hero.png', PNG);
    zip.file('HOW-TO-SUBMIT.md', 'ignored');
    const { parsed, assets } = await readPostZip(await toFile(zip));
    expect(parsed.meta.title).toBe('Zip test');
    expect(assets.map((a) => a.name)).toEqual(['hero.png']);
    expect(assets[0].file.type).toBe('image/png');
  });

  it('accepts a bare source .json under any name', async () => {
    const zip = new JSZip();
    zip.file('my-draft.json', sourceJson);
    const { parsed, assets } = await readPostZip(await toFile(zip));
    expect(parsed.meta.slug).toBe('zip-test');
    expect(assets).toEqual([]);
  });

  it('converts an index.mdx with its component files when no source json exists', async () => {
    const zip = new JSZip();
    zip.file('zip-test/index.mdx', MDX);
    zip.file('zip-test/Widget.tsx', 'export default function Widget() { return null; }');
    zip.file('zip-test/hero.png', PNG);
    const { parsed, assets } = await readPostZip(await toFile(zip));
    expect(parsed.meta.title).toBe('Zip test');
    expect(parsed.meta.slug).toBe('zip-test');
    const component = parsed.blocks.find((b) => b.type === 'customComponent');
    expect(component?.props.componentName).toBe('Widget');
    expect(String(component?.props.source)).toContain('function Widget');
    expect(assets.map((a) => a.name)).toEqual(['hero.png']);
  });

  it('rejects a ZIP with no post inside', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'nothing here');
    await expect(readPostZip(await toFile(zip))).rejects.toThrow('No post found');
  });
});
