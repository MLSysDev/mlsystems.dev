import type { APIRoute } from 'astro';
import { generatePageOgPng } from '@/lib/og';
import { pngResponseWithFallback } from '@/lib/og-response';

const SECTIONS: Record<string, string> = {
  blog: 'MLSystems blog',
  topics: 'Browse topics',
  community: 'Join the community',
  playground: 'Playground tools',
  contribute: 'Write with us',
  contact: 'Contact us',
  authors: 'Contributors',
  about: 'About ML Systems',
  search: 'Search',
};

export async function getStaticPaths() {
  return Object.entries(SECTIONS).map(([slug, title]) => ({
    params: { slug },
    props: { title },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  const { title } = props as { title: string };
  return pngResponseWithFallback(() => generatePageOgPng(title), `page:${params.slug}`);
};
