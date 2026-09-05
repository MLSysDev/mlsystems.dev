import mermaid from 'mermaid';

let ready = false;

function init(): void {
  if (ready) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    // Top-level htmlLabels is required: the flowchart-scoped flag alone still
    // emits foreignObject labels, which the SVG sanitizer strips.
    htmlLabels: false,
    flowchart: { htmlLabels: false },
  });
  ready = true;
}

let seq = 0;

// Single entry point so the block preview and the export-time bake always draw
// a diagram with the same settings.
export async function renderMermaid(source: string): Promise<string> {
  init();
  const { svg } = await mermaid.render(`mmd-${++seq}`, source);
  return svg;
}
