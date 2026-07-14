const BLOCKED_TAGS = new Set(['script', 'foreignobject', 'iframe', 'embed', 'object']);

// Removes script vectors from author-pasted SVG: script/foreignObject elements,
// on* event handlers, and non-fragment href targets. Runs wherever the markup is
// rendered or serialized in the browser; in Node (tests) it passes through.
export function sanitizeSvg(raw: string): string {
  if (typeof DOMParser === 'undefined') return raw;
  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return raw;

  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (BLOCKED_TAGS.has(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }
      walk(child);
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'xlink:href') && value && !value.startsWith('#')) {
        el.removeAttribute(attr.name);
      }
    }
  };
  walk(doc.documentElement);

  return new XMLSerializer().serializeToString(doc.documentElement);
}
