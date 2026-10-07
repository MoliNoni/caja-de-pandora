// Book cover with a hinged front: tap or swipe left to open it onto the synopsis page,
// swipe right (or "Cerrar") to close. Spine shading and stacked page edges give it thickness.

import { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, type Theme } from '../constants/theme';
import { useThemedStyles } from '../hooks/use-theme';

type Props = {
  uri: string | null;
  title: string;
  author?: string | null;
  /** undefined = still loading, null = none found. */
  synopsis?: string | null;
  width: number;
};

const OPEN_DEG = 165;
// No springs: an overshoot below 0 turns into a positive rotateY and the cover swings behind
// the book like a door. Opening slows as the spine resists lying flat; closing falls shut
// faster and faster, then lands with a small bounce toward the reader, never past closed.
const OPEN = { duration: 700, easing: Easing.out(Easing.cubic) };
const FALL = { duration: 420, easing: Easing.in(Easing.cubic) };
const shut = () => {
  'worklet';
  return withSequence(
    withTiming(0, FALL),
    withTiming(0.03, { duration: 90, easing: Easing.out(Easing.quad) }),
    withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) })
  );
};
const PAGE_EDGES = [3, 6, 9];

export function BookCover({ uri, title, author, synopsis, width }: Props) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const screen = useWindowDimensions().width;
  const height = width * 1.5;
  // Open, the book slides right so the turned cover peeks in from the left edge, like a spread.
  const shift = Math.max(0, (screen - width) / 2 - 12);
  // 0 = closed, 1 = fully open.
  const open = useSharedValue(0);
  const start = useSharedValue(0);

  // One peek on arrival hints that the cover turns.
  useEffect(() => {
    if (!reducedMotion) open.value = withDelay(500, withSequence(withTiming(0.16, { duration: 420, easing: Easing.out(Easing.quad) }), shut()));
  }, [open, reducedMotion]);

  const settle = (to: number) => {
    'worklet';
    open.value = reducedMotion ? withTiming(to, { duration: 0 }) : to === 1 ? withTiming(1, OPEN) : shut();
  };
  const pan = Gesture.Pan()
    // Horizontal only: vertical drags keep scrolling the screen and the synopsis.
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      start.value = open.value;
    })
    .onUpdate((e) => {
      open.value = Math.min(1, Math.max(0, start.value - e.translationX / width));
    })
    .onEnd((e) => {
      // A flick wins over position; otherwise snap to the nearer side.
      settle(e.velocityX < -500 ? 1 : e.velocityX > 500 ? 0 : Math.round(open.value));
    });

  const bookStyle = useAnimatedStyle((): ViewStyle => ({ transform: [{ translateX: shift * Math.min(1, Math.max(0, open.value)) }] }));
  // Hinge on the spine without transformOrigin: move the left edge to the centre, rotate, move back.
  // Negative rotateY lifts the free edge toward the reader, as a real cover opens.
  const coverStyle = useAnimatedStyle((): ViewStyle => {
    const o = Math.min(1, Math.max(0, open.value)); // never past closed or fully open
    const lift = Math.sin(Math.PI * o);
    return {
      transform: [
        { perspective: 1400 },
        { translateX: -width / 2 },
        { rotateY: `${-OPEN_DEG * o}deg` },
        { translateX: width / 2 },
        { scale: 1 + 0.04 * lift },
      ],
    };
  });
  // Past 90° the reader sees the inside of the cover, not the artwork.
  const frontStyle = useAnimatedStyle((): ViewStyle => ({ opacity: open.value < 90 / OPEN_DEG ? 1 : 0 }));
  const pageStyle = useAnimatedStyle((): ViewStyle => ({ opacity: interpolate(open.value, [0.2, 0.6], [0, 1], 'clamp') }));

  return (
    <View style={styles.stage}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.book, { width, height }, bookStyle]}>
          {PAGE_EDGES.map((offset) => (
            <View key={offset} style={[styles.pageEdge, { top: offset, bottom: offset, right: -offset }]} />
          ))}
          <Animated.View style={[styles.page, pageStyle]}>
            <Text style={styles.pageTitle} numberOfLines={2}>{title}</Text>
            {!!author && <Text style={styles.pageAuthor} numberOfLines={1}>{author}</Text>}
            <View style={styles.rule} />
            <ScrollView style={styles.synopsisScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={styles.synopsis}>
                {synopsis === undefined ? 'Buscando la sinopsis…' : synopsis || 'Sinopsis no disponible en español.'}
              </Text>
            </ScrollView>
            <Pressable onPress={() => settle(0)} accessibilityRole="button" accessibilityLabel="Cerrar el libro" hitSlop={8}>
              <Text style={styles.close}>Cerrar</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={[styles.cover, coverStyle]}>
            <View style={styles.coverInside} />
            <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => settle(1)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${title} y leer la sinopsis`}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <Text style={styles.pageTitle} numberOfLines={4}>{title}</Text>
                  </View>
                )}
                <View style={styles.spine} />
                <View style={styles.spineHighlight} />
              </Pressable>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    // Full-bleed clip: the turned cover runs off the left edge without making the page scroll sideways.
    stage: { marginHorizontal: -20, overflow: 'hidden', paddingTop: 4, paddingBottom: 14 },
    book: { alignSelf: 'center' },
    pageEdge: {
      position: 'absolute',
      left: 0,
      backgroundColor: '#F4ECDD',
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.12)',
    },
    page: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#FBF6EC',
      borderRadius: 4,
      paddingHorizontal: 18,
      paddingVertical: 16,
      gap: 4,
    },
    pageTitle: { fontFamily: Fonts.serif, fontSize: 18, fontWeight: '800', color: '#1A1033', textAlign: 'center' },
    pageAuthor: { fontFamily: Fonts.serif, fontSize: 13, fontStyle: 'italic', color: '#5B5470', textAlign: 'center' },
    rule: { height: 1, backgroundColor: 'rgba(26,16,51,0.15)', marginVertical: 8, marginHorizontal: 24 },
    synopsisScroll: { flex: 1 },
    synopsis: { fontFamily: Fonts.serif, fontSize: 14, lineHeight: 21, color: '#2A2340' },
    close: { alignSelf: 'flex-end', marginTop: 8, fontSize: 13, fontWeight: '700', color: t.accent },
    cover: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 4,
      overflow: 'hidden',
      boxShadow: '0px 18px 40px rgba(26,16,51,0.28), 0px 3px 8px rgba(26,16,51,0.18)',
    },
    coverInside: { ...StyleSheet.absoluteFillObject, backgroundColor: t.accent },
    image: { width: '100%', height: '100%' },
    placeholder: { backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', padding: 16 },
    // Spine: dark band where the cover folds, a thin highlight just after it.
    spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, backgroundColor: 'rgba(0,0,0,0.28)' },
    spineHighlight: { position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  });
