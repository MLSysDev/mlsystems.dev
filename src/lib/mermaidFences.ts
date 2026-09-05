import { renderMermaid } from './mermaidRender';
import { sanitizeSvg } from '../write/lib/sanitizeSvg';

// A post written as MDX by hand — or converted by script — carries a plain
// ```mermaid fence instead of an SVG baked by the editor, and the build ships
// that as a code block. Draw those in the browser so a valid diagram always
// renders, whatever authored it, and reopening the post in /write still
// recovers an editable mermaid block from the fence.
const FENCE = 'pre[data-language="mermaid"]';

export function hasMermaidFence(root: ParentNode): boolean {
  return root.querySelector(FENCE) !== null;
}

/** Returns true when at least one fence was replaced by a drawn diagram. */
export async function initMermaidFences(root: ParentNode): Promise<boolean> {
  let drew = false;
  for (const pre of [...root.querySelectorAll<HTMLPreElement>(FENCE)]) {
    const source = (pre.textContent ?? '').trim();
    if (!source) continue;
    try {
      const holder = document.createElement('div');
      holder.innerHTML = sanitizeSvg(await renderMermaid(source));
      const svg = holder.querySelector('svg');
      if (!svg) continue;
      // Match the baked form (<Figure width={960}>) so a drawn diagram sizes,
      // centres and zooms exactly like one the editor produced.
      svg.classList.add('mermaid-diagram');
      const figure = document.createElement('div');
      figure.className = 'inline-figure';
      figure.style.setProperty('--fig-w', '960px');
      figure.append(holder);
      pre.replaceWith(figure);
      drew = true;
    } catch {
      // Leave the fence as code: an invalid diagram still shows its source
      // rather than vanishing, and nothing blocks the page from rendering.
    }
  }
  return drew;
}
