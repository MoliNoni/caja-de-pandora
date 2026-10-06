import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, type Theme } from '../constants/theme';
import { useTheme, useThemedStyles } from '../hooks/use-theme';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

type ToggleGroupProps<T extends string> = {
  /** ≤ 4 options (design.md#hick); use a picker beyond that. */
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** 000h Toggle Group ported to RN: single-select, all options visible. */
export function ToggleGroup<T extends string>({ options, value, onChange, accessibilityLabel }: ToggleGroupProps<T>) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        const fg = selected ? theme.onAccent : theme.inkMuted;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.item, selected && styles.selected]}
          >
            {option.icon ? <Ionicons name={option.icon} size={18} color={fg} /> : null}
            <Text style={[styles.label, { color: fg }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    group: {
      flexDirection: 'row',
      padding: Spacing.xs,
      gap: Spacing.xs,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    item: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.pill,
    },
    selected: { backgroundColor: theme.accent },
    label: { fontSize: 15, fontWeight: '600' },
  });
