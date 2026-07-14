// Optional compression pass in front of addAsset(). To drop the feature, delete
// this file and unwrap the optimizeImage() calls in FigureBlock and GalleryBlock.

const SKIP_UNDER_BYTES = 400 * 1024;
const MAX_EDGE = 2400;
const QUALITY = 0.85;

// GIFs would lose animation; SVGs are text and already small.
const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml']);

export async function optimizeImage(file: File): Promise<File> {
  if (file.size < SKIP_UNDER_BYTES || SKIP_TYPES.has(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', QUALITY),
    );
    // Keep the original when the browser can't emit webp or re-encoding didn't shrink it.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;

    const stem = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${stem}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}
