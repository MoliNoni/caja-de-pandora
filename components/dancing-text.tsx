import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
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
import { SpinningRecord } from './app-header';

const STAGGER_MS = 45;
const WAVE_UP_MS = 700;
const WAVE_REST_MS = 2600; // pause between waves so the title settles and stays readable
const sine = Easing.inOut(Easing.sin);
// A glint of light sweeps the coloured letters, like light crossing a record.
const SHEEN_IN_MS = 700;
const SHEEN_OUT_MS = 1100;
const SHEEN_REST_MS = 3600;
const SHEEN_STEP_MS = 70;

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
  /** Letter index (spaces excluded) drawn as a spinning record, e.g. the "o" of the brand. */
  record?: number;
};

function Letter({ char, index, color, glint, style, wave, delay, record }: {
  char: string;
  index: number;
  color?: string;
  /** Highlight colour the letter brightens to while the sheen passes. */
  glint?: string;
  style?: StyleProp<TextStyle>;
  wave: boolean;
  delay: number;
  record?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const enter = useSharedValue(reducedMotion ? 1 : 0);
  const bob = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      enter.value = 1;
      return;
    }
    const start = delay + index * STAGGER_MS;
    enter.value = withDelay(start, withSpring(1, { damping: 18, stiffness: 120 }));
    if (wave) {
      // Same period for every letter, offset start: the bump travels across the word.
      bob.value = withDelay(
        start + 900 + index * 70,
        withRepeat(
          withSequence(
            withTiming(-5, { duration: WAVE_UP_MS, easing: sine }),
            withTiming(0, { duration: WAVE_UP_MS, easing: sine }),
            withTiming(0, { duration: WAVE_REST_MS })
          ),
          -1
        )
      );
    }
    sheen.value = withDelay(
      start + 600 + index * SHEEN_STEP_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SHEEN_IN_MS, easing: sine }),
          withTiming(0, { duration: SHEEN_OUT_MS, easing: sine }),
          withTiming(0, { duration: SHEEN_REST_MS })
        ),
        -1
      )
    );
    return () => {
      cancelAnimation(enter);
      cancelAnimation(bob);
      cancelAnimation(sheen);
    };
  }, [reducedMotion, wave, delay, index, enter, bob, sheen]);

  const tilt = index % 2 ? 8 : -8;
  const animated = useAnimatedStyle((): TextStyle => {
    return {
      ...(color && glint && !reducedMotion ? { color: interpolateColor(sheen.value, [0, 1], [color, glint]) } : null),
      opacity: Math.min(enter.value, 1),
      transform: [
        { translateY: (1 - enter.value) * 24 + bob.value },
        { rotate: `${(1 - enter.value) * tilt}deg` },
        { scale: 0.85 + 0.15 * enter.value },
      ],
    };
  });

  if (record) {
    // Same animated style as the letters (the cast only bridges Text/View style typings).
    // A lowercase-sized disc resting on the baseline, inside a box as tall as the line.
    const { fontSize = 32, lineHeight = fontSize * 1.1 } = StyleSheet.flatten(style) ?? {};
    const size = Math.round(fontSize * 0.56);
    return (
      <Animated.View style={[{ height: lineHeight, justifyContent: 'flex-end', paddingBottom: (lineHeight - fontSize) / 2 + fontSize * 0.2, marginHorizontal: fontSize * 0.03 }, animated as unknown as ViewStyle]}>
        <SpinningRecord size={size} />
      </Animated.View>
    );
  }
  return <Animated.Text style={[style, color ? { color } : null, animated]}>{char}</Animated.Text>;
}

/** Display title whose letters spring in one by one, dance in a slow wave and catch a travelling glint. Reads as one label to AT. */
export function DancingText({ text, style, containerStyle, wave = true, delay = 0, colors, record }: Props) {
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
                record={index === record}
                color={gradientAt(stops, index / last)}
                glint={theme.ink}
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
