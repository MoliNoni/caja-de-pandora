/**
 * Design tokens. Source of truth: design.md#tokens.
 * Dark only: the shop has one look. Read colors through `useTheme()` / `useThemedStyles()`.
 */

import { Platform } from 'react-native';

export const Colors = {
  dark: {
    bg: '#0B0A0C',
    surface: '#151317',
    ink: '#F5EEE6',
    inkMuted: '#ABA1B4',
    accent: '#E7B7A3',
    onAccent: '#1A0F14',
    border: '#2A262C',
    danger: '#F97066',
    success: '#4ADE80',
    scrim: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(36, 28, 46, 0.55)',
    glassBorder: 'rgba(241, 217, 181, 0.16)',
    glassShadow: '0 18px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
    vivid: ['#B8577A', '#C9825E', '#C9A45E', '#3E8C82', '#4A5FA8', '#7A5AB8'],
    /** Rose gold → champagne, the brand's metallic ramp. */
    gradients: {
      pandora: ['#C9868F', '#E7B7A3', '#F1D9B5'],
      vinyl: ['#B7A3E0', '#E7B7A3', '#F1D9B5'],
      books: ['#9CCBB8', '#E3D2A6', '#F1D9B5'],
      warm: ['#E7B7A3', '#F1D9B5'],
    },
  },
};

export type Theme = typeof Colors.dark;

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
    serif: "'Playfair Display', Georgia, serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
