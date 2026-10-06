/**
 * Design tokens. Source of truth: design.md#tokens.
 * Read colors through `useTheme()` / `useThemedStyles()` so light and dark both work.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    bg: '#F6F1E7',
    surface: '#FFFFFF',
    ink: '#1B1714',
    inkMuted: '#5C534B',
    accent: '#B4361F',
    onAccent: '#FFFFFF',
    border: '#E2D8C8',
    danger: '#B42318',
    success: '#1F7A4D',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    bg: '#14110F',
    surface: '#1E1A17',
    ink: '#F2ECE2',
    inkMuted: '#B5ABA0',
    accent: '#E2654B',
    onAccent: '#14110F',
    border: '#332C26',
    danger: '#F97066',
    success: '#4ADE80',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
};

export type Theme = typeof Colors.light;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Radius = { card: 8, pill: 999 } as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
