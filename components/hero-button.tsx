import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius, type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';

type HeroButtonProps = { label: string; onPress: () => void };

const PRESS = { duration: 220, easing: Easing.bezier(0.32, 0.72, 0, 1) };

/** Hero button: frosted capsule with the arrow in its own accent disc, which nudges right on press. No idle motion. */
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
        <Animated.View style={[styles.disc, arrow]} importantForAccessibility="no" accessibilityElementsHidden>
          <Ionicons name="arrow-forward" size={18} color={theme.onAccent} />
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
      gap: 16,
      minHeight: 56,
      paddingLeft: 26,
      paddingRight: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      backgroundColor: theme.glass,
      boxShadow: theme.glassShadow,
      ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)' } as object) : null),
    },
    label: { fontSize: 15, fontWeight: '500', letterSpacing: 0.6, color: theme.ink },
    disc: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
    },
  });
