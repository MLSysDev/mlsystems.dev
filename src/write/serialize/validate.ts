import type { PostMeta, SBlock } from './toMdx';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const COMPONENT_NAME_RE = /^[A-Z][A-Za-z0-9]*$/;

function walk(blocks: SBlock[], visit: (b: SBlock) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.children?.length) walk(block.children, visit);
  }
}

export function validate(meta: PostMeta, blocks: SBlock[]): string[] {
  const issues: string[] = [];
  if (!meta.title.trim()) issues.push('Add a title.');
  if (!meta.summary.trim()) issues.push('Add a one-sentence summary below the title.');
  if (!meta.topicId) issues.push('Pick a topic.');
  if (!SLUG_RE.test(meta.slug)) {
    issues.push('The URL slug must be lowercase words separated by hyphens, like my-article.');
  }

  let hasContent = false;
  walk(blocks, (b) => {
    if (b.type === 'paragraph' && Array.isArray(b.content) && b.content.length > 0) {
      hasContent = true;
    }
    if (b.type === 'figure' && (b.props.fileName || b.props.src) && !String(b.props.alt).trim()) {
      issues.push('An image is missing alt text.');
    }
    if (b.type === 'gallery') {
      try {
        const names = JSON.parse(String(b.props.fileNames || '[]')) as string[];
        const alts = JSON.parse(String(b.props.alts || '[]')) as string[];
        if (names.some((_, i) => !String(alts[i] ?? '').trim())) {
          issues.push('A gallery image is missing alt text.');
        }
      } catch {
        issues.push('A gallery block is corrupted — remove and re-add it.');
      }
    }
    if (b.type === 'video' && !b.props.videoId) {
      issues.push('A video block has no YouTube link yet.');
    }
    if (b.type === 'customComponent') {
      const name = String(b.props.componentName ?? '');
      const source = String(b.props.source ?? '');
      if (!name || !COMPONENT_NAME_RE.test(name)) {
        issues.push('A custom component needs a PascalCase name, like ThroughputViz.');
      }
      if (!source.trim()) issues.push('A custom component block has no code.');
    }
    if (b.type === 'math' && !String(b.props.latex ?? '').trim()) {
      issues.push('A math block is empty.');
    }
  });
  if (!hasContent) issues.push('Write at least one paragraph.');

  return [...new Set(issues)];
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
