/**
 * Theme registry. A theme is a set of CSS custom properties in `themes.css`
 * under `:root[data-theme='<id>']` plus an entry here for the picker.
 * Adding a theme = one CSS block + one entry below, nothing else.
 */
export const THEMES = [
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Dunkles Glas, kühles Cyan, rote Signale',
    scheme: 'dark',
    swatches: ['#0a1118', '#1c2732', '#8fd8e8', '#ef4444'],
  },
  {
    id: 'eclipse',
    label: 'Eclipse',
    description: 'Fast schwarz mit warmem Bernstein',
    scheme: 'dark',
    swatches: ['#0d0b09', '#221d19', '#f2a65a', '#ef5b4c'],
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Hell, ruhig, viel Luft',
    scheme: 'light',
    swatches: ['#e9edf1', '#ffffff', '#0e7490', '#dc2626'],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
/** 'auto' follows the system: dark → Orbit, light → Paper */
export type ThemeSetting = ThemeId | 'auto';

export const DEFAULT_THEME: ThemeId = 'orbit';
const AUTO_THEMES: Record<'dark' | 'light', ThemeId> = { dark: 'orbit', light: 'paper' };

export function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === 'auto' || THEMES.some((theme) => theme.id === value);
}

export function resolveTheme(setting: ThemeSetting, prefersDark: boolean): ThemeId {
  if (setting === 'auto') return AUTO_THEMES[prefersDark ? 'dark' : 'light'];
  return setting;
}

export function applyTheme(id: ThemeId) {
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.swatches[0]);
}
