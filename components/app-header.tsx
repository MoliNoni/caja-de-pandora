import { Ionicons } from '@expo/vector-icons';
import { RollingNumber } from './rolling-number';
import { useIsFocused } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Fonts, type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { useCart } from '../lib/cart-context';
import { FLY_MS, registerCartTarget } from './fly-to-cart';
import { ProfileMenu } from './profile-menu';

/** Brand mark: a small record that keeps turning. */
function SpinningRecord({ size }: { size: number }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    turn.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1);
    return () => cancelAnimation(turn);
  }, [reducedMotion, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const r = size / 2;
  return (
    <Animated.View style={spin}>
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r} fill="#111" />
        {[0.55, 0.7, 0.85].map((k) => (
          <Circle key={k} cx={r} cy={r} r={r * k} fill="none" stroke="#2C2C2C" strokeWidth={1} />
        ))}
        <Circle cx={r} cy={r} r={r * 0.38} fill={theme.vivid[0]} />
        <Circle cx={r * 1.14} cy={r * 0.86} r={r * 0.1} fill={theme.vivid[2]} />
        <Circle cx={r} cy={r} r={r * 0.08} fill={theme.bg} />
      </Svg>
    </Animated.View>
  );
}

/** Cart link (fly-to-cart target while focused); the badge counts up and pops when a flight lands. */
export function CartButton() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { itemCount } = useCart();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const ref = useRef<View>(null);
  const focused = useIsFocused();
  useEffect(() => (focused ? registerCartTarget(ref) : undefined), [focused]);

  const [shown, setShown] = useState(itemCount);
  useEffect(() => {
    const timer = setTimeout(() => setShown(itemCount), itemCount > shown && !reducedMotion ? FLY_MS : 0);
    return () => clearTimeout(timer);
  }, [itemCount, shown, reducedMotion]);
  useEffect(() => {
    if (reducedMotion || shown === 0) return;
    scale.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 220 }));
  }, [shown, reducedMotion, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      ref={ref}
      onPress={() => router.push('/cart')}
      accessibilityRole="link"
      accessibilityLabel={itemCount > 0 ? `Carrito, ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}` : 'Carrito'}
      hitSlop={4}
      style={(state) => [styles.iconButton, isFocused(state) && styles.focusRing]}
    >
      <Ionicons name="cart" size={22} color={theme.accent} />
      {shown > 0 && (
        <Animated.View style={[styles.badge, pop]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <RollingNumber text={String(shown)} style={styles.badgeText} />
        </Animated.View>
      )}
    </Pressable>
  );
}

type Props = {
  /** Show a back arrow (secondary screens) instead of acting as the brand home link. */
  back?: boolean;
  /** Profile + cart on the right (shop screens). */
  actions?: boolean;
  /** Where "back" goes when there is no history (e.g. after a reload on a deep link). */
  fallback?: Href;
};

/** Shared top bar: brand mark on the left (or back), profile and cart on the right. */
export function AppHeader({ back = false, actions = true, fallback = '/' }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {back ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={6}
            style={(state) => [styles.iconButton, styles.backButton, isFocused(state) && styles.focusRing]}
          >
            <Ionicons name="arrow-back" size={20} color={theme.ink} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.navigate('/')}
          accessibilityRole="link"
          accessibilityLabel="Caja de Pandora, inicio"
          style={(state) => [styles.brand, isFocused(state) && styles.focusRing]}
        >
          <SpinningRecord size={30} />
          <Text style={styles.brandText}>Caja de Pandora</Text>
        </Pressable>
      </View>
      {actions ? (
        <View style={styles.actions}>
          <ProfileMenu />
          <CartButton />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, paddingRight: 6 },
    brandText: { fontSize: 18, fontWeight: '800', fontFamily: Fonts.serif, letterSpacing: -0.4, color: t.ink },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    backButton: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    badge: {
      position: 'absolute',
      top: 2,
      right: 0,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: t.onAccent, fontSize: 11, fontWeight: '800' },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.accent, outlineOffset: 2 },
  });
