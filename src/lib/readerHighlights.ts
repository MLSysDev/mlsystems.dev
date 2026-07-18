interface HighlightItem {
  id: string;
  exact: string;
  prefix: string;
  suffix: string;
  ts: number;
}

const CTX = 32;
const MAX_LEN = 2000;

const key = () => `mls:hl:${location.pathname.replace(/\/$/, '')}`;

function load(): HighlightItem[] {
  try {
    const raw = localStorage.getItem(key());
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function save(items: HighlightItem[]): void {
  try {
    if (items.length === 0) localStorage.removeItem(key());
    else localStorage.setItem(key(), JSON.stringify({ v: 1, items }));
  } catch {
    /* storage unavailable — feature degrades silently */
  }
}

function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

function selectorFromRange(
  root: HTMLElement,
  range: Range,
): Pick<HighlightItem, 'exact' | 'prefix' | 'suffix'> | null {
  const exact = range.toString();
  if (!exact.trim() || exact.length > MAX_LEN) return null;
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const post = document.createRange();
  post.selectNodeContents(root);
  post.setStart(range.endContainer, range.endOffset);
  return { exact, prefix: pre.toString().slice(-CTX), suffix: post.toString().slice(0, CTX) };
}

function findOffsets(
  text: string,
  sel: Pick<HighlightItem, 'exact' | 'prefix' | 'suffix'>,
): [number, number] | null {
  const candidates: number[] = [];
  let i = text.indexOf(sel.exact);
  while (i !== -1) {
    candidates.push(i);
    i = text.indexOf(sel.exact, i + 1);
  }
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    let score = 0;
    if (text.slice(Math.max(0, c - sel.prefix.length), c) === sel.prefix) score += 2;
    if (text.slice(c + sel.exact.length, c + sel.exact.length + sel.suffix.length) === sel.suffix)
      score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return [best, best + sel.exact.length];
}

function applyMarks(root: HTMLElement, item: HighlightItem): void {
  const nodes = textNodes(root);
  const offsets = findOffsets(nodes.map((n) => n.data).join(''), item);
  if (!offsets) return;
  const [start, end] = offsets;

  const segments: { node: Text; s: number; e: number }[] = [];
  let pos = 0;
  for (const node of nodes) {
    const len = node.data.length;
    const s = Math.max(start - pos, 0);
    const e = Math.min(end - pos, len);
    if (s < e) segments.push({ node, s, e });
    pos += len;
    if (pos >= end) break;
  }

  for (const { node, s, e } of segments) {
    if (node.parentElement?.closest('mark.reader-hl')) continue;
    if (!node.data.slice(s, e).trim() && segments.length > 1) continue;
    let target = node;
    if (e < target.data.length) target.splitText(e);
    if (s > 0) target = target.splitText(s);
    const mark = document.createElement('mark');
    mark.className = 'reader-hl';
    mark.dataset.hlId = item.id;
    target.parentNode?.insertBefore(mark, target);
    mark.appendChild(target);
  }
}

function removeMarks(root: HTMLElement, id: string): void {
  root.querySelectorAll(`mark.reader-hl[data-hl-id="${id}"]`).forEach((mark) => {
    const parent = mark.parentNode;
    while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
    mark.remove();
    parent?.normalize();
  });
}

function rangeTouchesMark(range: Range): boolean {
  if (range.startContainer.parentElement?.closest('mark.reader-hl')) return true;
  if (range.endContainer.parentElement?.closest('mark.reader-hl')) return true;
  const frag = range.cloneContents();
  return frag.querySelector?.('mark.reader-hl') != null;
}

const ICON_ADD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4l8 8Z"/></svg>';
const ICON_REMOVE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>';

export function initReaderHighlights(root: HTMLElement): void {
  let items = load();
  for (const item of items) applyMarks(root, item);

  const pop = document.createElement('div');
  pop.className = 'reader-hl-pop';
  const btn = document.createElement('button');
  btn.type = 'button';
  pop.appendChild(btn);
  document.body.appendChild(pop);

  let mode: 'add' | 'remove' = 'add';
  let pendingRange: Range | null = null;
  let pendingId: string | null = null;

  const hide = () => {
    pop.classList.remove('is-open');
    pendingRange = null;
    pendingId = null;
  };

  const show = (rect: DOMRect, m: 'add' | 'remove') => {
    mode = m;
    btn.innerHTML = m === 'add' ? ICON_ADD : ICON_REMOVE;
    btn.setAttribute('aria-label', m === 'add' ? 'Highlight selection' : 'Remove highlight');
    pop.classList.add('is-open');
    const x = Math.min(Math.max(rect.left + rect.width / 2 - 20, 8), window.innerWidth - 48);
    const y = rect.top - 48;
    pop.style.left = `${x}px`;
    pop.style.top = `${Math.max(y, 8)}px`;
  };

  let timer = 0;
  const checkSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      if (mode === 'add') hide();
      return;
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      hide();
      return;
    }
    if (rangeTouchesMark(range) || !selectorFromRange(root, range)) {
      hide();
      return;
    }
    pendingRange = range.cloneRange();
    pendingId = null;
    show(range.getBoundingClientRect(), 'add');
  };

  document.addEventListener('selectionchange', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(checkSelection, 250);
  });

  root.addEventListener('click', (e) => {
    const mark = (e.target as HTMLElement).closest?.('mark.reader-hl');
    if (mark instanceof HTMLElement && mark.dataset.hlId) {
      pendingId = mark.dataset.hlId;
      pendingRange = null;
      show(mark.getBoundingClientRect(), 'remove');
      e.stopPropagation();
    }
  });

  document.addEventListener('click', (e) => {
    if (!pop.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('mark.reader-hl'))
      hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);

  btn.addEventListener('pointerdown', (e) => e.preventDefault());
  btn.addEventListener('click', () => {
    if (mode === 'add' && pendingRange) {
      const sel = selectorFromRange(root, pendingRange);
      if (sel) {
        const item: HighlightItem = {
          id: crypto.randomUUID ? crypto.randomUUID() : `hl-${Date.now()}-${Math.random()}`,
          ...sel,
          ts: Date.now(),
        };
        applyMarks(root, item);
        items.push(item);
        save(items);
      }
      window.getSelection()?.removeAllRanges();
    } else if (mode === 'remove' && pendingId) {
      removeMarks(root, pendingId);
      items = items.filter((i) => i.id !== pendingId);
      save(items);
    }
    hide();
  });
}
