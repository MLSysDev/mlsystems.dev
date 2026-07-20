const MIN = 0.4;
const MAX = 6;

let dialog: HTMLDialogElement | null = null;
let stage: HTMLElement;
let readout: HTMLButtonElement;
let scale = 1;
let x = 0;
let y = 0;

const apply = () => {
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  readout.textContent = `${Math.round(scale * 100)}%`;
};

const setScale = (next: number, cx?: number, cy?: number) => {
  const clamped = Math.min(Math.max(next, MIN), MAX);
  if (cx != null && cy != null) {
    const k = clamped / scale;
    x = cx - k * (cx - x);
    y = cy - k * (cy - y);
  }
  scale = clamped;
  apply();
};

function ensureDialog(): HTMLDialogElement {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'diagram-zoom';
  dialog.innerHTML =
    '<div class="diagram-zoom-bar">' +
    '<button type="button" data-z="out" aria-label="Zoom out">−</button>' +
    '<span class="diagram-zoom-readout">100%</span>' +
    '<button type="button" data-z="in" aria-label="Zoom in">+</button>' +
    '<button type="button" data-z="reset" aria-label="Reset view">↺</button>' +
    '<button type="button" data-z="close" aria-label="Close">✕</button>' +
    '</div><div class="diagram-zoom-canvas"><div class="diagram-zoom-stage"></div></div>';
  document.body.appendChild(dialog);

  stage = dialog.querySelector<HTMLElement>('.diagram-zoom-stage')!;
  readout = dialog.querySelector<HTMLButtonElement>('.diagram-zoom-readout')!;
  const canvas = dialog.querySelector<HTMLElement>('.diagram-zoom-canvas')!;

  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    stage.innerHTML = '';
  });
  dialog.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-z]');
    if (btn) {
      const z = btn.dataset.z;
      if (z === 'in') setScale(scale * 1.25);
      else if (z === 'out') setScale(scale / 1.25);
      else if (z === 'reset') {
        x = 0;
        y = 0;
        setScale(1);
      } else dialog?.close();
    } else if (e.target === dialog) {
      dialog?.close();
    }
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      setScale(
        scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    },
    { passive: false },
  );

  let dragging = false;
  let px = 0;
  let py = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    px = e.clientX;
    py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    x += e.clientX - px;
    y += e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    apply();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });

  return dialog;
}

function open(svg: SVGSVGElement): void {
  const d = ensureDialog();
  stage.innerHTML = '';
  stage.appendChild(svg.cloneNode(true));
  scale = 1;
  x = 0;
  y = 0;
  apply();
  d.showModal();
  document.documentElement.style.overflow = 'hidden';
}

export function initDiagramZoom(root: HTMLElement): void {
  const diagrams = [
    ...root.querySelectorAll<SVGSVGElement>('svg.mermaid-diagram, .mermaid-fig > svg'),
  ].filter((svg) => !svg.dataset.zoomable);

  for (const svg of diagrams) {
    svg.dataset.zoomable = '1';
    svg.classList.add('is-zoomable-diagram');
    svg.setAttribute('role', 'button');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('aria-label', 'Open diagram viewer');
    svg.addEventListener('click', () => open(svg));
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(svg);
      }
    });
    const host = svg.parentElement;
    if (host && !host.querySelector('.diagram-expand')) {
      host.classList.add('diagram-zoom-host');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'diagram-expand';
      btn.setAttribute('aria-label', 'Expand diagram');
      btn.textContent = '⤢';
      btn.addEventListener('click', () => open(svg));
      host.appendChild(btn);
    }
  }
}
