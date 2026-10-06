import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius, type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';

type HeroButtonProps = { label: string; onPress: () => void };

const PRESS = { duration: 160, easing: Easing.out(Easing.ease) };

/** 000h Hero button (capsule): accent pill, trailing arrow nudges right on press. No idle motion. */
export function HeroButton({ label, onPress }: HeroButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const arrowX = useSharedValue(0);
  const pill = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateX: arrowX.value }] }));

  const press = (down: boolean) => {
    if (reducedMotion) return;
    scale.value = withTiming(down ? 0.97 : 1, PRESS);
    arrowX.value = withTiming(down ? 4 : 0, PRESS);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(true)}
      onPressOut={() => press(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => [styles.wrapper, isFocused(state) && styles.focusRing]}
    >
      <Animated.View style={[styles.pill, pill]}>
        <Text style={styles.label}>{label}</Text>
        <Animated.View style={arrow} importantForAccessibility="no" accessibilityElementsHidden>
          <Ionicons name="arrow-forward" size={20} color={theme.onAccent} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: { alignSelf: 'flex-start' },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: theme.accent, outlineOffset: 2 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 52,
      paddingHorizontal: 24,
      borderRadius: Radius.pill,
      backgroundColor: theme.accent,
    },
    label: { fontSize: 17, fontWeight: '600', color: theme.onAccent },
  });
