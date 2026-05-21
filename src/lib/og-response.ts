import { generateDefaultOgPng } from '@/lib/og';

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export function pngResponse(png: Buffer): Response {
  return new Response(new Uint8Array(png), { headers: PNG_HEADERS });
}

export async function pngResponseWithFallback(
  produce: () => Promise<Buffer>,
  context: string,
): Promise<Response> {
  try {
    return pngResponse(await produce());
  } catch (err) {
    console.error(`[og] ${context} — falling back to default card. Cause:`, err);
    try {
      return pngResponse(await generateDefaultOgPng());
    } catch (fatal) {
      console.error('[og] default fallback also failed — returning 500.', fatal);
      return new Response('OG image generation failed', { status: 500 });
    }
  }
}
