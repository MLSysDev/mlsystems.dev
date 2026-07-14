import { addAsset } from '../storage/assets';

const RATIO = 1200 / 630;
const MAX_W = 1200;

// Center-crop an image to the 1.91:1 share ratio in the browser (HTML canvas).
// Only the cropped result is stored and uploaded, so what the author previews is
// exactly what ships — no build-time image processing. Falls back to the original
// file if anything goes wrong.
export async function cropToCover(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width: sw, height: sh } = bitmap;

    let cw = sw;
    let ch = Math.round(sw / RATIO);
    if (ch > sh) {
      ch = sh;
      cw = Math.round(sh * RATIO);
    }
    const sx = Math.round((sw - cw) / 2);
    const sy = Math.round((sh - ch) / 2);

    const outW = Math.min(MAX_W, cw);
    const outH = Math.round(outW / RATIO);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(bitmap, sx, sy, cw, ch, 0, 0, outW, outH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
    );
    if (!blob) return file;

    const stem = file.name.replace(/\.[^.]+$/, '') || 'cover';
    return new File([blob], `${stem}-cover.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// Crop a file to the share ratio and store it, returning the new asset name.
export async function addCroppedCover(file: File): Promise<string> {
  return addAsset(await cropToCover(file));
}
