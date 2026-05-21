import type { APIRoute } from 'astro';
import { generateDefaultOgPng } from '@/lib/og';
import { pngResponseWithFallback } from '@/lib/og-response';

export const GET: APIRoute = async () => pngResponseWithFallback(generateDefaultOgPng, 'default');
