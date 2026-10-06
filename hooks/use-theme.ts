import { useMemo } from 'react';

import { Colors, type Theme } from '../constants/theme';
import { useColorScheme } from './use-color-scheme';

export function useTheme(): Theme {
  return Colors[useColorScheme() ?? 'light'];
}

/** Builds a StyleSheet from the active theme; rebuilt only when the scheme changes. */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
