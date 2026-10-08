import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';

type HeroButtonProps = { label: string; onPress: () => void };

const PRESS = { duration: 220, easing: Easing.bezier(0.32, 0.72, 0, 1) };

/** Hero button: hairline rectangle, tracked caps, a thin arrow that nudges right on press. No idle motion. */
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
    scale.value = withTiming(down ? 0.98 : 1, PRESS);
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
          <Ionicons name="arrow-forward-outline" size={16} color={theme.accent} />
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
      gap: 14,
      minHeight: 52,
      paddingHorizontal: 24,
      borderRadius: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.accent,
    },
    label: { fontSize: 12, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: theme.ink },
  });
