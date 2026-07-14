import { describe, expect, it } from 'vitest';
import { optimizeImage } from './optimizeImage';

function fakeFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('optimizeImage', () => {
  it('passes small images through untouched', async () => {
    const file = fakeFile('photo.png', 'image/png', 100 * 1024);
    expect(await optimizeImage(file)).toBe(file);
  });

  it('skips gifs and svgs regardless of size', async () => {
    const gif = fakeFile('anim.gif', 'image/gif', 900 * 1024);
    const svg = fakeFile('chart.svg', 'image/svg+xml', 900 * 1024);
    expect(await optimizeImage(gif)).toBe(gif);
    expect(await optimizeImage(svg)).toBe(svg);
  });

  it('falls back to the original when decoding is unavailable', async () => {
    const file = fakeFile('big.png', 'image/png', 900 * 1024);
    expect(await optimizeImage(file)).toBe(file);
  });
});
