import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme, useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

type Props = TextInputProps & { label: string; error?: string; containerStyle?: StyleProp<ViewStyle> };

/** Editorial form field: tracked-caps label, hairline frame that turns accent on focus (no browser focus box). */
export function TextField({ label, error, containerStyle, style, multiline, onFocus, onBlur, ...input }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.group, containerStyle]}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      <TextInput
        accessibilityLabel={label.replace(/\s*\*$/, '')}
        placeholderTextColor={theme.inkMuted}
        {...input}
        multiline={multiline}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[styles.input, multiline && styles.multiline, focused && styles.focused, !!error && styles.invalid, style]}
      />
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite" aria-live="polite">{error}</Text> : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    group: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.inkMuted, marginBottom: 8 },
    labelFocused: { color: t.accent },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.inkMuted,
      borderRadius: 2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: t.ink,
      backgroundColor: t.surface,
      // Chrome draws `outline-style: auto` even at width 0; 'none' is valid CSS but missing from RN types.
      ...({ outlineStyle: 'none' } as object),
    },
    multiline: { minHeight: 96, textAlignVertical: 'top' },
    focused: { borderColor: t.accent },
    invalid: { borderColor: t.danger },
    error: { color: t.danger, fontSize: 12, marginTop: 6 },
  });
