import { memo, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
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
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../hooks/use-theme';
import { SpinningRecord } from './app-header';

const STAGGER_MS = 60;
// Entrance: each letter rises a little out of a soft blur, slow ease-out, no bounce (luxury, not cartoon).
const ENTER_MS = 1100;
const ENTER_RISE = 14;
const RECORD_TURN = -140; // the record letter turns into place as it lands
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
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

// Web runs the same motion through the Web Animations API: the browser animates it off the JS thread,
// so the wave stays smooth while carousels and scroll effects keep the page busy.
const SINE = 'cubic-bezier(0.37, 0, 0.63, 1)'; // Easing.inOut(Easing.sin)
const WAVE_PERIOD = WAVE_UP_MS * 2 + WAVE_REST_MS;
const SHEEN_PERIOD = SHEEN_IN_MS + SHEEN_OUT_MS + SHEEN_REST_MS;

function useWebLetterMotion(
  ref: React.RefObject<unknown>,
  inkRef: React.RefObject<unknown>,
  { index, delay, wave, enter, record, color, glint, reducedMotion }: { index: number; delay: number; wave: boolean; enter: boolean; record: boolean; color?: string; glint?: string; reducedMotion: boolean }
) {
  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el?.animate || reducedMotion) return;
    const start = delay + index * STAGGER_MS;
    // Chrome composites a transform animation only when it is the element's sole one and uses 'replace':
    // the entrance ends at identity with no forward fill, and is removed before the wave is created.
    // Without an entrance the letters are already in place (static HTML included) and only the wave runs.
    const timing = { duration: ENTER_MS, delay: start, easing: EASE_OUT };
    const entrance = enter
      ? el.animate(
          [
            { transform: `translateY(${ENTER_RISE}px)${record ? ` rotate(${RECORD_TURN}deg)` : ''}`, filter: 'blur(8px)' },
            { transform: `translateY(0px)${record ? ' rotate(0deg)' : ''}`, filter: 'blur(0px)' },
          ],
          { ...timing, fill: 'backwards' }
        )
      : null;
    const anims: Animation[] = entrance
      ? [el.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: ENTER_MS * 0.8, fill: 'both' }), entrance]
      : [];
    if (wave) {
      const up = WAVE_UP_MS / WAVE_PERIOD;
      (entrance?.finished ?? Promise.resolve()).then(
        () => {
          entrance?.cancel();
          anims.push(
            el.animate(
              [
                { transform: 'translateY(0px)', easing: SINE },
                { transform: 'translateY(-5px)', offset: up, easing: SINE },
                { transform: 'translateY(0px)', offset: up * 2 },
                { transform: 'translateY(0px)' },
              ],
              { duration: WAVE_PERIOD, delay: 300 + index * 70, iterations: Infinity }
            )
          );
        },
        () => {} // cancelled on unmount
      );
    }
    // The glint lives on the inner text: a colour animation re-styles its element every frame, which
    // would keep Chrome from compositing the transforms if they shared it.
    const ink = inkRef.current as HTMLElement | null;
    if (ink && color && glint) {
      anims.push(
        ink.animate(
          [
            { color, easing: SINE },
            { color: glint, offset: SHEEN_IN_MS / SHEEN_PERIOD, easing: SINE },
            { color, offset: (SHEEN_IN_MS + SHEEN_OUT_MS) / SHEEN_PERIOD },
            { color },
          ],
          { duration: SHEEN_PERIOD, delay: start + ENTER_MS + index * SHEEN_STEP_MS, iterations: Infinity }
        )
      );
    }
    return () => anims.forEach((a) => a.cancel());
  }, [ref, inkRef, index, delay, wave, enter, record, color, glint, reducedMotion]);
}

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Letters keep bobbing in a travelling wave after they land. */
  wave?: boolean;
  /** Ms before the first letter enters. */
  delay?: number;
  /** Letters spring in on mount. Off: they are there from the first paint (no pop on page load). */
  enter?: boolean;
  /** Gradient stops spread across the letters (#RRGGBB). Default: theme.gradients.pandora. */
  colors?: string[];
  /** Colour the travelling glint brightens each letter to. Default: theme.ink. */
  glint?: string;
  /** Letter index (spaces excluded) drawn as a spinning record, e.g. the "o" of the brand. */
  record?: number;
};

type LetterProps = {
  char: string;
  index: number;
  color?: string;
  /** Highlight colour the letter brightens to while the sheen passes. */
  glint?: string;
  style?: StyleProp<TextStyle>;
  wave: boolean;
  delay: number;
  enter: boolean;
  record?: boolean;
};

const WebLetter = memo(function WebLetter({ char, index, color, glint, style, wave, delay, enter, record }: LetterProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<View>(null);
  const inkRef = useRef<Text>(null);
  useWebLetterMotion(ref, inkRef, { index, delay, wave, enter, record: !!record, color, glint: color && glint ? glint : undefined, reducedMotion });
  // Hidden until its entrance runs (the static HTML must not flash the whole title first).
  const hidden = { opacity: reducedMotion || !enter ? 1 : 0 };
  if (record) {
    const { fontSize = 32, lineHeight = fontSize * 1.1 } = StyleSheet.flatten(style) ?? {};
    const size = Math.round(fontSize * 0.56);
    return (
      <View ref={ref} style={{ ...hidden, height: lineHeight, justifyContent: 'flex-end', paddingBottom: (lineHeight - fontSize) / 2 + fontSize * 0.2, marginHorizontal: fontSize * 0.03 }}>
        <SpinningRecord size={size} />
      </View>
    );
  }
  // Motion on the box, colour on the text inside it.
  return (
    <View ref={ref} style={hidden}>
      <Text ref={inkRef} style={[style, color ? { color } : null]}>{char}</Text>
    </View>
  );
});

const NativeLetter = memo(function NativeLetter({ char, index, color, glint, style, wave, delay, enter: entrance, record }: LetterProps) {
  const reducedMotion = useReducedMotion();
  const enter = useSharedValue(reducedMotion || !entrance ? 1 : 0);
  const bob = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      enter.value = 1;
      return;
    }
    const start = delay + index * STAGGER_MS;
    if (entrance) enter.value = withDelay(start, withTiming(1, { duration: ENTER_MS, easing: easeOut }));
    if (wave) {
      // Same period for every letter, offset start: the bump travels across the word.
      bob.value = withDelay(
        start + ENTER_MS + 300 + index * 70,
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
      start + ENTER_MS + index * SHEEN_STEP_MS,
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
  }, [reducedMotion, wave, delay, entrance, index, enter, bob, sheen]);

  const animated = useAnimatedStyle((): TextStyle => {
    return {
      ...(color && glint && !reducedMotion ? { color: interpolateColor(sheen.value, [0, 1], [color, glint]) } : null),
      opacity: Math.min(enter.value, 1),
      transform: [
        { translateY: (1 - enter.value) * ENTER_RISE + bob.value },
        { rotate: `${record ? (1 - enter.value) * RECORD_TURN : 0}deg` },
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
});

const Letter = Platform.OS === 'web' ? WebLetter : NativeLetter;

/** Display title whose letters rise in one by one out of a soft blur, dance in a slow wave and catch a travelling glint. Reads as one label to AT. */
export const DancingText = memo(function DancingText({ text, style, containerStyle, wave = true, delay = 0, enter = true, colors, glint, record }: Props) {
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
                enter={enter}
                record={index === record}
                color={gradientAt(stops, index / last)}
                glint={glint ?? theme.ink}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  word: { flexDirection: 'row' },
});
