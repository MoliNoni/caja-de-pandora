import { useId } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '../hooks/use-theme';

const forcedColors =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia?.('(forced-colors: active)').matches;

/**
 * Static decorative texture behind a screen (design.md#components): `dots` app-wide,
 * `contours` (record grooves) on vinyl screens. Hidden from assistive tech; off in forced colors.
 * Render it as the first child of a screen container.
 */
export function PatternBackground({ variant = 'dots' }: { variant?: 'dots' | 'contours' }) {
  const theme = useTheme();
  const id = `pattern${useId().replace(/:/g, '')}`;

  if (forcedColors) return null;

  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%">
        <Defs>
          {variant === 'dots' ? (
            <Pattern id={id} width={16} height={16} patternUnits="userSpaceOnUse">
              <Circle cx={8} cy={8} r={1} fill={theme.ink} />
            </Pattern>
          ) : (
            <Pattern id={id} width={160} height={160} patternUnits="userSpaceOnUse">
              {[12, 28, 44, 60, 76].map((r) => (
                <Circle key={r} cx={80} cy={80} r={r} fill="none" stroke={theme.ink} strokeWidth={1} />
              ))}
            </Pattern>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={variant === 'dots' ? 0.06 : 0.05} />
      </Svg>
    </View>
  );
}
