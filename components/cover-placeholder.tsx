// Typographic cover for products without an image: a cloth binding in one of the brand's
// vivid tones (picked from the title, so a product always gets the same one), a hairline
// inset frame, and the title set in the display serif. Below 90px wide only the initial fits.

import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Fonts } from '../constants/theme';

const IVORY = '#FFFDF9';
// Light-theme tones in both themes: they are the darker set, so ivory text keeps its contrast.
const BINDINGS = Colors.light.vivid;

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

type Props = {
  title: string;
  author?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function CoverPlaceholder({ title, author, style }: Props) {
  const [width, setWidth] = useState(0);
  const binding = BINDINGS[Math.abs(hash(title)) % BINDINGS.length];
  const compact = width > 0 && width < 90;
  const titleSize = Math.max(12, Math.round(width * 0.11));

  return (
    <View
      style={[styles.cover, { backgroundColor: binding }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
    >
      {width === 0 ? null : compact ? (
        <Text style={[styles.initial, { fontSize: width * 0.5 }]}>{title.trim().charAt(0).toUpperCase()}</Text>
      ) : (
        <View style={[styles.frame, { margin: width * 0.06, padding: width * 0.07 }]}>
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]} numberOfLines={4}>
            {title}
          </Text>
          <View style={[styles.rule, { width: width * 0.16 }]} />
          {author ? (
            <Text style={[styles.author, { fontSize: Math.max(9, Math.round(titleSize * 0.5)) }]} numberOfLines={2}>
              {author}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  frame: {
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 253, 249, 0.55)',
  },
  title: { fontFamily: Fonts.serif, fontWeight: '500', color: IVORY, textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: IVORY, opacity: 0.7, marginVertical: 10 },
  author: { color: IVORY, opacity: 0.85, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  initial: { fontFamily: Fonts.serif, fontWeight: '500', color: IVORY },
});
