import { useMemo } from 'react';

import { Colors, type Theme } from '../constants/theme';

export function useTheme(): Theme {
  return Colors.dark;
}

/** Builds a StyleSheet from the theme once per component. */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  return useMemo(() => factory(Colors.dark), [factory]);
}
