import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../hooks/use-theme';

// Wrapping Ionicons in createAnimatedComponent breaks on web (its setNativeProps forwards to a DOM node),
// so the glyph is drawn by an Animated.Text in the Ionicons font instead.
const FONT_FAMILY = Ionicons.getFontFamily();

type Props = { name: ComponentProps<typeof Ionicons>['name']; focused: boolean; color: string };

/** Tab icon: the current tab cycles through the vivid palette and pops once when selected. */
export function TabIcon({ name, focused, color }: Props) {
  const { vivid } = useTheme();
  const [fontLoaded] = useFonts(Ionicons.font);
  const reducedMotion = useReducedMotion();
  const hue = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!focused || reducedMotion) {
      cancelAnimation(hue);
      hue.value = 0;
      scale.value = 1;
      return;
    }
    hue.value = 0;
    hue.value = withRepeat(withTiming(vivid.length, { duration: vivid.length * 900, easing: Easing.linear }), -1);
    scale.value = withSequence(withTiming(1.2, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 260 }));
    return () => cancelAnimation(hue);
  }, [focused, reducedMotion, vivid.length, hue, scale]);

  // Last stop repeats the first so the loop has no jump.
  const stops = [...vivid, vivid[0]];
  const animated = useAnimatedStyle(() => ({
    color: focused && !reducedMotion ? interpolateColor(hue.value, stops.map((_, i) => i), stops) : color,
    transform: [{ scale: scale.value }],
  }));

  if (!fontLoaded) return <Ionicons name={name} size={24} color={color} />;
  return (
    <Animated.Text style={[styles.glyph, animated]} accessible={false} selectable={false}>
      {String.fromCodePoint(Ionicons.glyphMap[name] as number)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  glyph: { fontFamily: FONT_FAMILY, fontSize: 24, lineHeight: 24, fontWeight: 'normal', fontStyle: 'normal' },
});
