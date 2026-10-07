/**
 * Design tokens. Source of truth: design.md#tokens.
 * Read colors through `useTheme()` / `useThemedStyles()` so light and dark both work.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    bg: '#FFF7EE',
    surface: '#FFFFFF',
    ink: '#1A1033',
    inkMuted: '#5B5370',
    accent: '#E0115F',
    onAccent: '#FFFFFF',
    border: '#F0E3D6',
    danger: '#B42318',
    success: '#0F7A55',
    scrim: 'rgba(26, 16, 51, 0.5)',
    /** Display colors (letters, blobs, glows). Each keeps >= 3:1 against `bg` for large text. */
    vivid: ['#E0115F', '#E85D04', '#B7791F', '#0F9D7A', '#2563EB', '#7C3AED'],
  },
  dark: {
    bg: '#0E0A1F',
    surface: '#1A1430',
    ink: '#F7F2FF',
    inkMuted: '#B9B0D0',
    accent: '#FF4F8B',
    onAccent: '#14081F',
    border: '#2E2550',
    danger: '#F97066',
    success: '#4ADE80',
    scrim: 'rgba(0, 0, 0, 0.6)',
    vivid: ['#FF4F8B', '#FF9F1C', '#FFD60A', '#2EE6B6', '#5EA8FF', '#B38CFF'],
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
    /** Display face, loaded in app/+html.tsx. */
    serif: "'Bricolage Grotesque', Georgia, serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
