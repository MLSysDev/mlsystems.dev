const files = new Map<string, File>();
const urls = new Map<string, string>();

function sanitize(name: string): string {
  const dot = name.lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  return `${stem || 'image'}${ext}`;
}

export function addAsset(file: File): string {
  const base = sanitize(file.name);
  let name = base;
  let n = 2;
  while (files.has(name)) {
    const dot = base.lastIndexOf('.');
    name = dot > 0 ? `${base.slice(0, dot)}-${n}${base.slice(dot)}` : `${base}-${n}`;
    n++;
  }
  files.set(name, file);
  return name;
}

export function restoreAsset(name: string, file: File): void {
  files.set(name, file);
}

export function getAsset(name: string): File | undefined {
  return files.get(name);
}

export function getAssetUrl(name: string): string {
  const cached = urls.get(name);
  if (cached) return cached;
  const file = files.get(name);
  if (!file) return '';
  const url = URL.createObjectURL(file);
  urls.set(name, url);
  return url;
}

export function allAssets(): { name: string; file: File }[] {
  return [...files.entries()].map(([name, file]) => ({ name, file }));
}

export function removeAsset(name: string): void {
  files.delete(name);
  const url = urls.get(name);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(name);
  }
}

export function clearAssets(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  files.clear();
  urls.clear();
}
