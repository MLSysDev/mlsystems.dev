// Inline pre-paint reader in BaseLayout.astro must be kept in sync with this.

export const PREFS_KEY = 'mls.prefs';

export type Accent = 'oxide' | 'indigo' | 'emerald';
export type Theme = 'light' | 'dark';

export type Prefs = {
  theme?: Theme;
  accent?: Accent;
};

export const ACCENTS: Accent[] = ['oxide', 'indigo', 'emerald'];

export function readPrefs(): Prefs {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as Prefs;
    const legacyTheme = localStorage.getItem('theme');
    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      const migrated: Prefs = { theme: legacyTheme };
      localStorage.setItem(PREFS_KEY, JSON.stringify(migrated));
      localStorage.removeItem('theme');
      return migrated;
    }
  } catch {}
  return {};
}

export function writePrefs(patch: Prefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const next = { ...readPrefs(), ...patch };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {}
}
