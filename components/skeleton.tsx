import { useEffect, useState, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Shimmering placeholder block (design.md#skeletons). Static when reduced motion is on. */
export function Skeleton({ width = '100%', height, aspectRatio, radius = Radius.card, style }: SkeletonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(progress);
      return;
    }
    progress.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, true);
  }, [progress, reducedMotion]);

  const animated = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.border, theme.surface]),
  }));

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, aspectRatio, borderRadius: radius }, reducedMotion ? { backgroundColor: theme.border } : animated, style]}
    />
  );
}

/** Product card placeholder: 2:3 cover + 2 text lines + price chip. */
export function SkeletonCard({ width }: { width?: DimensionValue }) {
  return (
    <View style={{ width, gap: 8 }}>
      <Skeleton aspectRatio={2 / 3} />
      <Skeleton height={14} width="90%" />
      <Skeleton height={14} width="60%" />
      <Skeleton height={24} width={64} radius={Radius.pill} />
    </View>
  );
}

/**
 * Loading region: renders nothing for the first 150 ms (avoids a flash), then the skeleton
 * children with a single busy label for the whole region.
 */
export function SkeletonRegion({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(id);
  }, []);

  return (
    <View accessible accessibilityLabel="Cargando…" accessibilityState={{ busy: true }} style={style}>
      {visible ? children : null}
    </View>
  );
}
