import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius, Spacing, type Theme } from '../constants/theme';
import { useTheme, useThemedStyles } from '../hooks/use-theme';

type Variant = 'accent' | 'outline' | 'ghost' | 'default';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** accent = the one primary CTA per screen; outline/ghost = secondary (design.md#components). */
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const PRESS = { duration: 160, easing: Easing.out(Easing.ease) };

/** 000h Button ported to RN: pill, press scale 0.97 / 160 ms ease-out, busy while loading. */
export function Button({
  label,
  onPress,
  variant = 'accent',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const inactive = disabled || loading;
  const fg = variant === 'accent' ? theme.onAccent : variant === 'default' ? theme.ink : theme.accent;
  const press = (to: number) => {
    if (!reducedMotion) scale.value = withTiming(to, PRESS);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[fullWidth && styles.fullWidth, style]}
    >
      <Animated.View
        style={[styles.base, styles[size], styles[variant], inactive && styles.inactive, animated]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={fg} /> : null}
            <Text style={[styles.label, size === 'lg' && styles.labelLg, { color: fg }]}>{label}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    fullWidth: { alignSelf: 'stretch' },
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    md: { minHeight: 44, paddingHorizontal: Spacing.lg },
    lg: { minHeight: 52, paddingHorizontal: Spacing.xl },
    accent: { backgroundColor: theme.accent },
    outline: { borderColor: theme.accent },
    ghost: {},
    default: { backgroundColor: theme.surface, borderColor: theme.border },
    inactive: { opacity: 0.5 },
    label: { fontSize: 15, fontWeight: '600' },
    labelLg: { fontSize: 17 },
  });
