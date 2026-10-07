import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../hooks/use-theme';

const STAGGER_MS = 45;
const WAVE_UP_MS = 420;
const WAVE_REST_MS = 2200; // pause between waves so the title settles and stays readable
const sine = Easing.inOut(Easing.sin);

/** Colour at t (0..1) along a list of #RRGGBB stops. */
function gradientAt(stops: string[], t: number) {
  if (stops.length === 1) return stops[0];
  const x = t * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const [a, b] = [stops[i], stops[i + 1]].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * (x - i)));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Letters keep bobbing in a travelling wave after they land. */
  wave?: boolean;
  /** Ms before the first letter enters. */
  delay?: number;
  /** Gradient stops spread across the letters (#RRGGBB). Default: theme.gradients.pandora. */
  colors?: string[];
};

function Letter({ char, index, color, style, wave, delay }: {
  char: string;
  index: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  wave: boolean;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const enter = useSharedValue(reducedMotion ? 1 : 0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      enter.value = 1;
      return;
    }
    const start = delay + index * STAGGER_MS;
    enter.value = withDelay(start, withSpring(1, { damping: 9, stiffness: 150 }));
    if (wave) {
      // Same period for every letter, offset start: the bump travels across the word.
      bob.value = withDelay(
        start + 900 + index * 70,
        withRepeat(
          withSequence(
            withTiming(-7, { duration: WAVE_UP_MS, easing: sine }),
            withTiming(0, { duration: WAVE_UP_MS, easing: sine }),
            withTiming(0, { duration: WAVE_REST_MS })
          ),
          -1
        )
      );
    }
    return () => {
      cancelAnimation(enter);
      cancelAnimation(bob);
    };
  }, [reducedMotion, wave, delay, index, enter, bob]);

  const tilt = index % 2 ? 28 : -28;
  const animated = useAnimatedStyle((): TextStyle => ({
    opacity: Math.min(enter.value, 1),
    transform: [
      { translateY: (1 - enter.value) * 44 + bob.value },
      { rotate: `${(1 - enter.value) * tilt}deg` },
      { scale: 0.3 + 0.7 * enter.value },
    ],
  }));

  return <Animated.Text style={[style, color ? { color } : null, animated]}>{char}</Animated.Text>;
}

/** Display title whose letters spring in one by one, then dance in a slow wave. Reads as one label to AT. */
export function DancingText({ text, style, containerStyle, wave = true, delay = 0, colors }: Props) {
  const theme = useTheme();
  const stops = colors ?? theme.gradients.pandora;
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 32;
  const last = Math.max(text.replace(/ /g, '').length - 1, 1);
  let i = 0;

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}
      style={[styles.row, { columnGap: fontSize * 0.28 }, containerStyle]}
    >
      {text.split(' ').map((word, w) => (
        <View key={w} style={styles.word} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {[...word].map((char) => {
            const index = i++;
            return (
              <Letter
                key={index}
                char={char}
                index={index}
                style={style}
                wave={wave}
                delay={delay}
                color={gradientAt(stops, index / last)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  word: { flexDirection: 'row' },
});
