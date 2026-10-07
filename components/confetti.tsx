// Confetti for a confirmed order: tiny records and books rain down the screen once.
// Decorative only: no touches, hidden from assistive tech, off under reduced motion.

import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useTheme } from '../hooks/use-theme';

const COUNT = 28;

type Piece = { x: number; delay: number; ms: number; sway: number; spin: number; size: number; record: boolean; color: string };

function Falling({ p, height }: { p: Piece; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: p.ms, easing: Easing.in(Easing.quad) }));
  }, [t, p]);
  const style = useAnimatedStyle((): ViewStyle => ({
    opacity: t.value > 0.85 ? (1 - t.value) / 0.15 : 1,
    transform: [
      { translateX: p.x + Math.sin(t.value * Math.PI * 3) * p.sway },
      { translateY: -40 + (height + 80) * t.value },
      { rotate: `${p.spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.piece, style]}>
      {p.record ? (
        <View style={[styles.record, { width: p.size, height: p.size, borderRadius: p.size / 2 }]}>
          <View style={{ width: p.size * 0.36, height: p.size * 0.36, borderRadius: p.size, backgroundColor: p.color }} />
        </View>
      ) : (
        <View style={[styles.book, { width: p.size * 0.72, height: p.size, backgroundColor: p.color }]}>
          <View style={styles.spine} />
        </View>
      )}
    </Animated.View>
  );
}

export function Confetti({ play }: { play: boolean }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: Math.random() * width,
        delay: Math.random() * 700,
        ms: 1800 + Math.random() * 900,
        sway: 10 + Math.random() * 24,
        spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
        size: 14 + Math.random() * 10,
        record: i % 2 === 0,
        color: theme.vivid[i % theme.vivid.length],
      })),
    // New rain per confirmed order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [play, width]
  );

  if (!play || reducedMotion) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {pieces.map((p, i) => (
        <Falling key={i} p={p} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0 },
  record: { backgroundColor: '#15101F', alignItems: 'center', justifyContent: 'center' },
  book: { borderRadius: 2 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(0,0,0,0.3)' },
});
