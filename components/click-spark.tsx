import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

const RAYS = Array.from({ length: 8 }, (_, i) => i * 45);

function Ray({ angle, play }: { angle: number; play: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const progress = useSharedValue(0);
  useEffect(() => {
    if (play) progress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [play, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: play ? 1 - progress.value : 0,
    transform: [{ rotate: `${angle}deg` }, { translateY: -(15 + 15 * progress.value) }] as const,
  }));
  return <Animated.View style={[styles.ray, style]} />;
}

/** 000h Click Spark: 8 accent rays burst once when `play` flips true. Web only; no-op natively / reduced motion. */
export function ClickSpark({ play }: { play: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  if (Platform.OS !== 'web' || reducedMotion) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
    >
      {RAYS.map((angle) => (
        <Ray key={angle} angle={angle} play={play} />
      ))}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    ray: { position: 'absolute', width: 2, height: 10, backgroundColor: t.accent },
  });
