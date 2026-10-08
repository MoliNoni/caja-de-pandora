import { useEffect, useId, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../hooks/use-theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useAudioLevel } from '../lib/player-context';

const forcedQuery =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.matchMedia?.('(forced-colors: active)') : undefined;

const subscribe = (onChange: () => void) => {
  forcedQuery?.addEventListener?.('change', onChange);
  return () => forcedQuery?.removeEventListener?.('change', onChange);
};
const getForcedColors = () => forcedQuery?.matches ?? false;

const BLOB = 460;

// Position (% of screen) and drift loop of each colour blob.
const BLOBS = [
  { color: 0, left: '-20%', top: '-12%', dx: 70, dy: 50, ms: 11000 },
  { color: 4, left: '45%', top: '20%', dx: -80, dy: 60, ms: 13000 },
  { color: 2, left: '-10%', top: '60%', dx: 60, dy: -70, ms: 15000 },
  { color: 5, left: '55%', top: '75%', dx: -50, dy: -40, ms: 12000 },
] as const;

function Blob({ color, left, top, dx, dy, ms, opacity }: (typeof BLOBS)[number] & { opacity: number }) {
  const theme = useTheme();
  const id = `blob${useId().replace(/:/g, '')}`;
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);
  const audio = useAudioLevel();

  useEffect(() => {
    if (reducedMotion) return;
    t.value = withRepeat(withTiming(1, { duration: ms * 1.6, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [reducedMotion, ms, t]);

  const drift = useAnimatedStyle((): ViewStyle => ({
    transform: [
      { translateX: dx * t.value },
      { translateY: dy * t.value },
      // Blobs breathe with the music when real audio samples are available.
      { scale: 1 + 0.15 * t.value + (reducedMotion ? 0 : 0.12 * audio.live.value * audio.level.value) },
    ],
  }));

  const fill = theme.vivid[color];
  return (
    <Animated.View style={[styles.blob, { left, top }, drift]}>
      <Svg width={BLOB} height={BLOB}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={fill} stopOpacity={opacity} />
            <Stop offset="1" stopColor={fill} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={BLOB / 2} cy={BLOB / 2} r={BLOB / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Decorative backdrop behind a screen: slow drifting colour blobs (aurora) under a fine texture,
 * `dots` app-wide, `contours` (record grooves) on vinyl screens. Static under reduced motion,
 * hidden from assistive tech and off in forced colours. Render it as the first child of a screen.
 */
export function PatternBackground({ variant = 'dots' }: { variant?: 'dots' | 'contours' }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const id = `pattern${useId().replace(/:/g, '')}`;
  const forcedColors = useSyncExternalStore(subscribe, getForcedColors, () => false);

  if (forcedColors) return null;

  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip]}
    >
      {BLOBS.map((b) => (
        <Blob key={b.color} {...b} opacity={dark ? 0.16 : 0.1} />
      ))}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {variant === 'dots' ? (
            <Pattern id={id} width={18} height={18} patternUnits="userSpaceOnUse">
              <Circle cx={9} cy={9} r={1} fill={theme.ink} />
            </Pattern>
          ) : (
            <Pattern id={id} width={160} height={160} patternUnits="userSpaceOnUse">
              {[12, 28, 44, 60, 76].map((r) => (
                <Circle key={r} cx={80} cy={80} r={r} fill="none" stroke={theme.ink} strokeWidth={1} />
              ))}
            </Pattern>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={variant === 'dots' ? 0 : 0.04} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  blob: { position: 'absolute', width: BLOB, height: BLOB },
});
