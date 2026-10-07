// Pull-to-refresh indicator: a small record that turns as you pull and spins while refreshing.
// Sits over the top of a list whose RefreshControl spinner is made transparent.

import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const SIZE = 40;
const PULL = 70; // px of overscroll for a fully shown record

type Props = {
  /** The list's scroll offset: negative while pulled past the top (iOS overscroll). */
  scrollY: SharedValue<number>;
  refreshing: boolean;
  color: string;
};

export function RefreshRecord({ scrollY, refreshing, color }: Props) {
  const reducedMotion = useReducedMotion();
  const spin = useSharedValue(0);
  const busy = useSharedValue(0);

  useEffect(() => {
    busy.value = withTiming(refreshing ? 1 : 0, { duration: 200 });
    if (refreshing && !reducedMotion) {
      spin.value = withRepeat(withTiming(spin.value + 360, { duration: 900, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(spin);
    }
  }, [refreshing, reducedMotion, spin, busy]);

  const style = useAnimatedStyle((): ViewStyle => {
    const pull = interpolate(-scrollY.value, [0, PULL], [0, 1], 'clamp');
    const shown = Math.max(pull, busy.value);
    return {
      opacity: shown,
      transform: [
        { translateY: -SIZE + (SIZE + 12) * shown },
        { scale: 0.6 + 0.4 * shown },
        { rotate: `${spin.value + -scrollY.value * 4}deg` },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.record}>
        <View style={styles.groove} />
        <View style={[styles.label, { backgroundColor: color }]} />
        {/* Off-centre highlight makes the turn visible. */}
        <View style={styles.sheen} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, alignSelf: 'center', zIndex: 2 },
  record: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#15101F',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0,0,0,0.25)',
  },
  groove: {
    position: 'absolute',
    width: SIZE * 0.72,
    height: SIZE * 0.72,
    borderRadius: SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  label: { width: SIZE * 0.34, height: SIZE * 0.34, borderRadius: SIZE },
  sheen: {
    position: 'absolute',
    top: 5,
    left: 9,
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
