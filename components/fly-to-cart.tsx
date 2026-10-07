import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Image, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../hooks/use-theme';
import { successHaptic } from '../lib/haptics';

// Fly-to-cart: the product thumbnail arcs from the tapped button to the header cart.
// The focused CartButton registers itself as the target; one overlay at the app root draws the flight.

export const FLY_MS = 650;
const THUMB = 46;
const ARC = 140; // px the path bows upward at its middle

let cartTarget: RefObject<View | null> | null = null;

/** Called by the focused cart button; returns the cleanup. */
export function registerCartTarget(ref: RefObject<View | null>) {
  cartTarget = ref;
  return () => {
    if (cartTarget === ref) cartTarget = null;
  };
}

type Flight = { id: number; from: { x: number; y: number }; to: { x: number; y: number }; image?: string | null };
type FlyFn = (event: GestureResponderEvent, image?: string | null) => void;
const FlyContext = createContext<FlyFn>(() => undefined);

/** `fly(e, imageUri)` on an add-to-cart press. */
export const useFlyToCart = () => useContext(FlyContext);

function Thumb({ f, done }: { f: Flight; done: (id: number) => void }) {
  const theme = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: FLY_MS, easing: Easing.inOut(Easing.cubic) });
    const timer = setTimeout(() => {
      successHaptic(); // the thumbnail lands in the cart
      done(f.id);
    }, FLY_MS + 30);
    return () => clearTimeout(timer);
  }, [t, f.id, done]);
  const style = useAnimatedStyle((): ViewStyle => {
    const p = t.value;
    return {
      opacity: p < 0.85 ? 1 : (1 - p) / 0.15,
      transform: [
        { translateX: f.from.x + (f.to.x - f.from.x) * p - THUMB / 2 },
        { translateY: f.from.y + (f.to.y - f.from.y) * p - ARC * 4 * p * (1 - p) - THUMB / 2 },
        { rotate: `${-24 * p}deg` },
        { scale: 1 - 0.6 * p },
      ],
    };
  });
  const box = { position: 'absolute' as const, width: THUMB, height: THUMB, borderRadius: 10, backgroundColor: theme.accent };
  return (
    <Animated.View style={[box, styles.thumb, style]}>
      {f.image ? <Image source={{ uri: f.image }} style={StyleSheet.absoluteFill} /> : null}
    </Animated.View>
  );
}

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);
  const seq = useRef(0);

  const done = useCallback((id: number) => setFlights((all) => all.filter((f) => f.id !== id)), []);

  const fly = useCallback<FlyFn>(
    (event, image) => {
      const target = cartTarget?.current;
      // No flight to land: confirm the add right away.
      if (reducedMotion || !target) return successHaptic();
      const from = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
      target.measureInWindow((x, y, w, h) => {
        if (!w) return successHaptic(); // target not on screen
        const id = ++seq.current;
        setFlights((all) => [...all, { id, from, to: { x: x + w / 2, y: y + h / 2 }, image }]);
      });
    },
    [reducedMotion]
  );

  return (
    <FlyContext.Provider value={fly}>
      {children}
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        {flights.map((f) => (
          <Thumb key={f.id} f={f} done={done} />
        ))}
      </View>
    </FlyContext.Provider>
  );
}

const styles = StyleSheet.create({
  thumb: { left: 0, top: 0, overflow: 'hidden', borderWidth: 2, borderColor: '#FFFFFF', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' },
});
