interface TocEntry {
  el: HTMLElement;
  level: 2 | 3;
  link: HTMLAnchorElement;
  mark: HTMLElement;
  item: HTMLLIElement;
}

const MIN_HEADINGS = 3;

export function initTocRail(article: HTMLElement): void {
  const headings = Array.from(article.querySelectorAll<HTMLElement>('h2[id], h3[id]'));
  if (headings.length < MIN_HEADINGS) return;

  const rail = document.createElement('nav');
  rail.className = 'toc-rail';
  rail.setAttribute('aria-label', 'Table of contents');

  const marks = document.createElement('div');
  marks.className = 'toc-marks';
  marks.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'toc-panel';
  const label = document.createElement('div');
  label.className = 'toc-label';
  label.textContent = 'Contents';
  const list = document.createElement('ol');

  const entries: TocEntry[] = headings.map((el) => {
    const level = el.tagName === 'H3' ? 3 : 2;

    const mark = document.createElement('span');
    mark.className = `toc-mark${level === 3 ? ' toc-mark--h3' : ''}`;
    marks.appendChild(mark);

    const item = document.createElement('li');
    item.className = `toc-item lvl-${level}`;
    const link = document.createElement('a');
    link.href = `#${el.id}`;
    link.textContent = el.textContent?.trim() ?? '';
    item.appendChild(link);
    list.appendChild(item);

    return { el, level, link, mark, item };
  });

  panel.append(label, list);
  rail.append(marks, panel);
  document.body.appendChild(rail);

  let active = -1;
  const setActive = (idx: number) => {
    if (idx === active) return;
    if (active >= 0) {
      entries[active].mark.classList.remove('is-active');
      entries[active].item.classList.remove('is-active');
    }
    active = idx;
    if (idx >= 0) {
      entries[idx].mark.classList.add('is-active');
      entries[idx].item.classList.add('is-active');
      const link = entries[idx].link;
      const panelRect = panel.getBoundingClientRect();
      if (panelRect.height > 0) {
        const linkTop = link.offsetTop;
        if (linkTop < panel.scrollTop || linkTop > panel.scrollTop + panel.clientHeight - 40)
          panel.scrollTop = linkTop - panel.clientHeight / 2;
      }
    }
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.3;
    let idx = 0;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].el.getBoundingClientRect().top <= line) idx = i;
    }
    // Before the first heading scrolls past the line, nothing is "current".
    if (entries[0].el.getBoundingClientRect().top > line) idx = -1;
    setActive(idx);
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();

  // Touch devices have no hover — tapping the dash rail toggles the panel.
  marks.addEventListener('click', () => rail.classList.toggle('is-open'));
  document.addEventListener('click', (e) => {
    if (!rail.contains(e.target as Node)) rail.classList.remove('is-open');
  });

  for (const entry of entries) {
    entry.link.addEventListener('click', (e) => {
      e.preventDefault();
      entry.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${entry.el.id}`);
      rail.classList.remove('is-open');
    });
  }
}
