import { createContext, memo, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

// Pixel burst: square particles fly out from the tap point, spin, fall a little and fade.
// One overlay at the app root, so a burst survives the navigation its tap triggers.

type Size = 'sm' | 'md' | 'lg';
type Particle = { dx: number; dy: number; spin: number; size: number; color: string };
type Burst = { id: number; x: number; y: number; particles: Particle[]; ms: number };

const PRESETS: Record<Size, { count: number; reach: number; pixel: number; ms: number }> = {
  sm: { count: 10, reach: 34, pixel: 4, ms: 520 },
  md: { count: 16, reach: 70, pixel: 6, ms: 680 },
  lg: { count: 26, reach: 110, pixel: 7, ms: 820 },
};
const GRAVITY = 26; // px of drop at the end of the flight

type BurstFn = (event: GestureResponderEvent | { pageX: number; pageY: number }, colors: string[], size?: Size) => void;
const BurstContext = createContext<BurstFn>(() => undefined);

/** Fire a burst at a press event's position: `burst(e, theme.gradients.books, 'lg')`. */
export const useBurst = () => useContext(BurstContext);

const FRAMES = 16;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

/** The same flight as the native Pixel, sampled into keyframes the browser runs off the JS thread. */
function WebPixel({ p, ms }: { p: Particle; ms: number }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el?.animate) return;
    const frames = Array.from({ length: FRAMES + 1 }, (_, i) => {
      const t = easeOutCubic(i / FRAMES);
      return {
        opacity: 1 - t * t,
        transform: `translateX(${p.dx * t}px) translateY(${p.dy * t + GRAVITY * t * t}px) rotate(${p.spin * t}deg) scale(${1 - 0.5 * t})`,
      };
    });
    const anim = el.animate(frames, { duration: ms, fill: 'forwards' });
    return () => anim.cancel();
  }, [p, ms]);
  return (
    <View
      ref={ref}
      style={{ position: 'absolute', width: p.size, height: p.size, left: -p.size / 2, top: -p.size / 2, backgroundColor: p.color }}
    />
  );
}

function NativePixel({ p, ms }: { p: Particle; ms: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: ms, easing: Easing.out(Easing.cubic) });
  }, [t, ms]);
  const style = useAnimatedStyle((): ViewStyle => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: p.dx * t.value },
      { translateY: p.dy * t.value + GRAVITY * t.value * t.value },
      { rotate: `${p.spin * t.value}deg` },
      { scale: 1 - 0.5 * t.value },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: p.size, height: p.size, left: -p.size / 2, top: -p.size / 2, backgroundColor: p.color },
        style,
      ]}
    />
  );
}

const Pixel = Platform.OS === 'web' ? WebPixel : NativePixel;

// Memoized: adding or removing one burst must not re-render the particles of the others in flight
// (fast repeated taps stacked dozens of re-renders per tap).
const BurstGroup = memo(function BurstGroup({ b }: { b: Burst }) {
  return (
    <View style={{ position: 'absolute', left: b.x, top: b.y }}>
      {b.particles.map((p, i) => (
        <Pixel key={i} p={p} ms={b.ms} />
      ))}
    </View>
  );
});

export function PixelBurstProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);

  const burst = useCallback<BurstFn>(
    (event, colors, size = 'md') => {
      if (reducedMotion || colors.length === 0) return;
      const source = 'nativeEvent' in event ? event.nativeEvent : event;
      const { count, reach, pixel, ms } = PRESETS[size];
      const particles = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
        const dist = reach * (0.45 + Math.random() * 0.55);
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          spin: (Math.random() - 0.5) * 540,
          size: Math.max(2, Math.round(pixel * (0.6 + Math.random() * 0.6))),
          color: colors[i % colors.length],
        };
      });
      const id = ++seq.current;
      setBursts((all) => [...all, { id, x: source.pageX, y: source.pageY, particles, ms }]);
      setTimeout(() => setBursts((all) => all.filter((b) => b.id !== id)), ms + 50);
    },
    [reducedMotion]
  );

  return (
    <BurstContext.Provider value={burst}>
      {children}
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        {bursts.map((b) => (
          <BurstGroup key={b.id} b={b} />
        ))}
      </View>
    </BurstContext.Provider>
  );
}
