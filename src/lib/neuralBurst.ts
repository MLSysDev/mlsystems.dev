interface Node {
  x: number;
  y: number;
}

interface Edge {
  a: Node;
  b: Node;
  w: number;
  speed: number;
}

const FORWARD = 850;
const PAUSE = 120;
const BACKWARD = 650;
const FADE = 450;
const TAIL = 0.22;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.2);

export function neuralBurst(host: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  host.querySelector('[data-neural-burst]')?.remove();

  const rect = host.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w < 10 || h < 10) return;

  const canvas = document.createElement('canvas');
  canvas.dataset.neuralBurst = '';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  host.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const accent =
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#b3502d';

  const maxLayers = Math.max(3, Math.min(7, Math.floor(w / 150)));
  const maxNodes = Math.max(3, Math.min(6, Math.floor(h / 110)));
  const layerCount = Math.max(3, maxLayers - Math.floor(Math.random() * 2));
  const layers: Node[][] = [];
  for (let i = 0; i < layerCount; i++) {
    const n = Math.max(2, maxNodes - Math.floor(Math.random() * 3));
    const nodes: Node[] = [];
    const lx = (w / (layerCount - 1)) * i;
    for (let j = 0; j < n; j++) {
      nodes.push({
        x: lx + (Math.random() - 0.5) * w * 0.04,
        y: (h / (n + 1)) * (j + 1) + (Math.random() - 0.5) * h * 0.12,
      });
    }
    layers.push(nodes);
  }

  const edges: Edge[] = [];
  for (let i = 0; i < layerCount - 1; i++) {
    for (const a of layers[i]) {
      for (const b of layers[i + 1]) {
        if (Math.random() < (w < 640 ? 0.55 : 0.75))
          edges.push({ a, b, w: 0.4 + Math.random() * 1.4, speed: 0.85 + Math.random() * 0.3 });
      }
    }
  }

  const start = performance.now();
  const total = FORWARD + PAUSE + BACKWARD + FADE;

  const drawPass = (front: number, dir: 1 | -1, strength: number, base: number) => {
    for (const e of edges) {
      const x0 = dir === 1 ? Math.min(e.a.x, e.b.x) : w - Math.max(e.a.x, e.b.x);
      const x1 = dir === 1 ? Math.max(e.a.x, e.b.x) : w - Math.min(e.a.x, e.b.x);
      const p0 = x0 / w;
      const p1 = x1 / w;
      const f = Math.min(front * e.speed, 1 + TAIL);
      if (f <= p0) continue;
      const lit = Math.min(1, (f - p0) / Math.max(p1 - p0, 0.01));
      const fade = Math.max(0, 1 - (f - p1) / TAIL);
      const alpha = 0.3 * strength * lit * (f > p1 ? fade : 1);
      if (alpha <= 0.01) continue;

      const from = dir === 1 ? e.a : e.b;
      const to = dir === 1 ? e.b : e.a;
      const mx = from.x + (to.x - from.x) * lit;
      const my = from.y + (to.y - from.y) * lit;

      ctx.globalAlpha = base * alpha;
      ctx.lineWidth = e.w;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(mx, my);
      ctx.stroke();

      if (lit < 1) {
        ctx.globalAlpha = base * 0.85 * strength;
        ctx.beginPath();
        ctx.arc(mx, my, 1.6 + e.w * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const layer of layers) {
      for (const n of layer) {
        const p = (dir === 1 ? n.x : w - n.x) / w;
        if (front <= p) continue;
        const since = (front - p) / TAIL;
        const glow = Math.max(0, 1 - since);
        ctx.globalAlpha = base * Math.min(0.15 + glow * 0.55, 0.7) * strength;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.4 + glow * 2.6, 0, Math.PI * 2);
        ctx.fill();

        if (glow > 0.55) {
          const ring = (1 - glow) / 0.45;
          ctx.globalAlpha = base * (1 - ring) * 0.5 * strength;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 4 + ring * 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  };

  const frame = (now: number) => {
    const t = now - start;
    if (t > total) {
      canvas.remove();
      return;
    }

    const base = t < FORWARD + PAUSE + BACKWARD ? 1 : 1 - (t - FORWARD - PAUSE - BACKWARD) / FADE;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineCap = 'round';

    if (t < FORWARD + PAUSE) {
      const front = easeOut(Math.min(t / FORWARD, 1)) * (1 + TAIL);
      drawPass(front, 1, 1, base);
    } else {
      const bt = (t - FORWARD - PAUSE) / BACKWARD;
      const front = easeOut(Math.min(bt, 1)) * (1 + TAIL);
      drawPass(front, -1, 0.55, base);
    }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
