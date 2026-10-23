import { useEffect } from 'react';
import { applyTheme, resolveTheme, type ThemeId, type ThemeSetting } from '../themes';
import { useMediaQuery } from './useMediaQuery';

/** Applies the chosen theme to <html> and follows the system when set to 'auto' */
export function useTheme(setting: ThemeSetting): ThemeId {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = resolveTheme(setting, prefersDark);
  useEffect(() => applyTheme(theme), [theme]);
  return theme;
}
