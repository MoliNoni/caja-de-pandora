import { Ionicons } from '@expo/vector-icons';
import { RollingNumber } from './rolling-number';
import { useIsFocused } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { useCart } from '../lib/cart-context';
import { FLY_MS, registerCartTarget } from './fly-to-cart';
import { ProfileMenu } from './profile-menu';

const GROOVES = Array.from({ length: 14 }, (_, i) => 0.46 + i * 0.035);

/** Light wedge from the centre between two angles (degrees, 0 = right, clockwise). */
const wedge = (r: number, from: number, to: number) => {
  const pt = (deg: number) => `${r + r * Math.cos((deg * Math.PI) / 180)} ${r + r * Math.sin((deg * Math.PI) / 180)}`;
  return `M ${r} ${r} L ${pt(from)} A ${r} ${r} 0 0 1 ${pt(to)} Z`;
};

/** Brand mark: a glossy record that keeps turning under a fixed studio light. */
export function SpinningRecord({ size }: { size: number }) {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    turn.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1);
    return () => cancelAnimation(turn);
  }, [reducedMotion, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const r = size / 2;
  const hairline = Math.max(size / 160, 0.4);
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`vinyl${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.4" stopColor="#262626" />
              <Stop offset="1" stopColor="#050505" />
            </RadialGradient>
            <LinearGradient id={`label${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.vivid[0]} />
              <Stop offset="1" stopColor={theme.vivid[1]} />
            </LinearGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill={`url(#vinyl${id})`} />
          {GROOVES.map((k, i) => (
            <Circle key={k} cx={r} cy={r} r={r * k} fill="none" stroke="#fff" strokeOpacity={i % 3 ? 0.05 : 0.11} strokeWidth={hairline} />
          ))}
          {/* Lead-out gap between tracks. */}
          <Circle cx={r} cy={r} r={r * 0.72} fill="none" stroke="#000" strokeOpacity={0.6} strokeWidth={hairline * 3} />
          <Circle cx={r} cy={r} r={r * 0.4} fill={`url(#label${id})`} />
          <Circle cx={r} cy={r} r={r * 0.33} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={hairline} />
          {/* Off-centre print on the label so the turn reads even at icon size. */}
          <Path d={`M ${r * 0.72} ${r * 0.86} A ${r * 0.3} ${r * 0.3} 0 0 1 ${r * 1.14} ${r * 0.7}`} stroke={theme.vivid[2]} strokeWidth={r * 0.07} strokeLinecap="round" fill="none" />
          <Circle cx={r} cy={r} r={r * 0.06} fill={theme.bg} />
        </Svg>
      </Animated.View>
      {/* Static sheen: the light stays put while the disc turns underneath it. */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={wedge(r, 200, 245)} fill="#fff" fillOpacity={0.13} />
        <Path d={wedge(r, 20, 65)} fill="#fff" fillOpacity={0.07} />
        <Circle cx={r} cy={r} r={r - hairline} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={hairline * 2} />
      </Svg>
    </View>
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
  /** Screen title on the left, sharing the row with the actions instead of sitting under an empty bar. */
  title?: ReactNode;
};

/** Shared top bar: back arrow on the left (secondary screens), profile and cart on the right. */
export function AppHeader({ back = false, actions = true, fallback = '/', title }: Props) {
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
        {title}
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
