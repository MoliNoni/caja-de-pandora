// Odometer text: every digit is a 0-9 column that rolls to its new value when `text` changes.
// Non-digit characters ($ . ,) render as plain text. Screen readers get the whole string once.

import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const DIGITS = '0123456789'.split('');
const SPRING = { damping: 22, stiffness: 420, overshootClamping: true };

// Memoized: when 12.40 becomes 12.50 only the tens-of-cents column re-renders and rolls.
const Digit = memo(function Digit({ digit, height, style }: { digit: number; height: number; style: StyleProp<TextStyle> }) {
  const reducedMotion = useReducedMotion();
  const y = useSharedValue(-digit * height);
  useEffect(() => {
    y.value = reducedMotion ? -digit * height : withSpring(-digit * height, SPRING);
  }, [digit, height, reducedMotion, y]);
  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Animated.View style={roll}>
        {DIGITS.map((d) => (
          <Text key={d} style={[style, { height, lineHeight: height }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
});

// Memoized: a cart change re-renders only the numbers whose text changed.
export const RollingNumber = memo(function RollingNumber({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  // Margins and horizontal padding belong to the row: on each digit they would break the roll
  // offsets or spread multi-digit numbers apart.
  const { outer, textStyle, digitStyle } = useMemo(() => {
    const {
      margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical,
      paddingHorizontal, paddingLeft, paddingRight,
      ...text
    } = StyleSheet.flatten(style) ?? {};
    return {
      outer: {
        margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical,
        paddingHorizontal, paddingLeft, paddingRight,
      },
      textStyle: text,
      digitStyle: [text, styles.tabular],
    };
  }, [style]);
  const height = textStyle.lineHeight ?? Math.round((textStyle.fontSize ?? 14) * 1.3);
  const chars = text.split('');

  return (
    <View style={[styles.row, outer]} accessible accessibilityLabel={text}>
      {chars.map((c, i) => {
        // Keyed from the right, so units stay units when the number grows a digit.
        const key = chars.length - i;
        return /\d/.test(c) ? (
          <Digit key={key} digit={Number(c)} height={height} style={digitStyle} />
        ) : (
          <Text key={key} style={[textStyle, { height, lineHeight: height }]}>
            {c}
          </Text>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  tabular: { fontVariant: ['tabular-nums'] },
});
