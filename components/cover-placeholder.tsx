// House cover for products without an image, in the shop's own language: a near-black plum
// binding, a rose gold → champagne foil frame (the brand's metallic ramp), the title in the
// display serif, and the brand record. Vinyls are a sleeve with the record sliding out;
// books carry the record as the publisher's mark. Below 90px wide only the mark fits.

import { useId, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors, Fonts } from '../constants/theme';
import { SpinningRecord } from './app-header';

// Same in both themes: a printed cover doesn't change with the screen.
const BINDING = '#16101A';
const SLEEVE = '#221827';
const FOIL = Colors.dark.gradients.pandora; // rose gold → champagne
const CHAMPAGNE = FOIL[2];

type Props = {
  title: string;
  author?: string | null;
  kind: 'book' | 'vinyl';
  style?: StyleProp<ViewStyle>;
};

/** Double foil rule, like a stamped binding. */
function Foil({ width, height, inset }: { width: number; height: number; inset: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`foil${id}`} x1="0" y1="0" x2="1" y2="1">
          {FOIL.map((c, i) => (
            <Stop key={c} offset={i / (FOIL.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={inset} y={inset} width={width - inset * 2} height={height - inset * 2} fill="none" stroke={`url(#foil${id})`} strokeWidth={1} />
      <Rect x={inset + 4} y={inset + 4} width={width - inset * 2 - 8} height={height - inset * 2 - 8} fill="none" stroke={`url(#foil${id})`} strokeOpacity={0.45} strokeWidth={0.75} />
    </Svg>
  );
}

export function CoverPlaceholder({ title, author, kind, style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const compact = width > 0 && width < 90;
  const vinyl = kind === 'vinyl';
  const titleSize = Math.max(13, Math.round(width * 0.1));
  const inset = Math.round(width * 0.05);
  // Vinyl: the record slides up out of a sleeve that fills the lower part of the cover.
  const disc = Math.round(Math.min(width * 0.8, height * 0.62));
  const sleeveHeight = Math.round(height * 0.56);

  const text = (
    <>
      <Text style={[styles.kicker, { fontSize: Math.max(8, Math.round(titleSize * 0.42)) }]}>{vinyl ? 'Vinilo' : 'Libro'}</Text>
      <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.18 }]} numberOfLines={vinyl ? 2 : 4}>
        {title}
      </Text>
      {author ? (
        <Text style={[styles.author, { fontSize: Math.max(9, Math.round(titleSize * 0.5)) }]} numberOfLines={vinyl ? 1 : 2}>
          {author}
        </Text>
      ) : null}
    </>
  );

  return (
    <View
      style={[styles.cover, style]}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      importantForAccessibility="no-hide-descendants"
    >
      {width === 0 ? null : compact ? (
        <SpinningRecord size={Math.min(width, height) * 0.62} still />
      ) : vinyl ? (
        <>
          <View style={[styles.disc, { top: height - sleeveHeight - disc * 0.62 }]}>
            <SpinningRecord size={disc} still />
          </View>
          <View style={[styles.sleeve, { height: sleeveHeight }]}>
            <Foil width={width} height={sleeveHeight} inset={inset} />
            <View style={[styles.body, { padding: inset + width * 0.07 }]}>{text}</View>
          </View>
        </>
      ) : (
        <>
          <Foil width={width} height={height} inset={inset} />
          <View style={[styles.body, { padding: inset + width * 0.08 }]}>
            {text}
            {/* The brand record as the publisher's mark. */}
            <View style={styles.imprint}>
              <SpinningRecord size={Math.max(18, Math.round(width * 0.16))} still />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: BINDING,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  disc: { position: 'absolute', alignSelf: 'center' },
  sleeve: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SLEEVE,
    boxShadow: '0 -10px 24px rgba(0, 0, 0, 0.45)',
  },
  body: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  kicker: { color: FOIL[1], fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontFamily: Fonts.serif, fontWeight: '500', color: CHAMPAGNE },
  author: { color: CHAMPAGNE, opacity: 0.7, marginTop: 8 },
  imprint: { position: 'absolute', bottom: '9%', alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
});
