// Book cover with a hinged front: swipe it left (or tap) to open onto the title page,
// swipe right to close. Spine shading and stacked page edges give it thickness.

import { useEffect } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, type Theme } from '../constants/theme';
import { useThemedStyles } from '../hooks/use-theme';

type Props = {
  uri: string | null;
  title: string;
  author?: string | null;
  width: number;
};

const OPEN_DEG = 160;
const SPRING = { damping: 16, stiffness: 140 };
const PAGE_EDGES = [3, 6, 9];

export function BookCover({ uri, title, author, width }: Props) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const height = width * 1.5;
  // 0 = closed, 1 = fully open.
  const open = useSharedValue(0);
  const start = useSharedValue(0);

  // One peek on arrival hints that the cover turns.
  useEffect(() => {
    if (!reducedMotion) open.value = withDelay(450, withSequence(withTiming(0.22, { duration: 380 }), withSpring(0, SPRING)));
  }, [open, reducedMotion]);

  const settle = (to: number) => {
    'worklet';
    open.value = reducedMotion ? withTiming(to, { duration: 0 }) : withSpring(to, SPRING);
  };
  const pan = Gesture.Pan()
    // Horizontal only: vertical drags keep scrolling the page.
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
  const tap = Gesture.Tap().onEnd(() => settle(open.value > 0.5 ? 0 : 1));

  const coverStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [{ perspective: 1200 }, { rotateY: `${-OPEN_DEG * open.value}deg` }],
  }));
  // Past 90° the reader sees the inside of the cover, not the artwork.
  const frontStyle = useAnimatedStyle((): ViewStyle => ({ opacity: open.value < 90 / OPEN_DEG ? 1 : 0 }));
  const pageStyle = useAnimatedStyle((): ViewStyle => ({ opacity: interpolate(open.value, [0, 0.35], [0, 1]) }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        style={[styles.book, { width, height }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Portada de ${title}`}
        accessibilityHint="Desliza o toca para abrir el libro"
      >
        {PAGE_EDGES.map((offset) => (
          <View key={offset} style={[styles.pageEdge, { top: offset, bottom: offset, right: -offset }]} />
        ))}
        <Animated.View style={[styles.titlePage, pageStyle]}>
          <Text style={styles.pageTitle} numberOfLines={4}>{title}</Text>
          {!!author && <Text style={styles.pageAuthor} numberOfLines={2}>{author}</Text>}
        </Animated.View>
        <Animated.View style={[styles.cover, coverStyle]}>
          <View style={styles.coverInside} />
          <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
            {uri ? (
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Text style={styles.pageTitle} numberOfLines={4}>{title}</Text>
              </View>
            )}
            <View style={styles.spine} />
            <View style={styles.spineHighlight} />
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    book: { alignSelf: 'center', marginTop: 8, marginBottom: 28 },
    pageEdge: {
      position: 'absolute',
      left: 0,
      backgroundColor: '#F4ECDD',
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.12)',
    },
    titlePage: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#FBF6EC',
      borderRadius: 4,
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    pageTitle: { fontFamily: Fonts.serif, fontSize: 20, fontWeight: '800', color: '#1A1033', textAlign: 'center' },
    pageAuthor: { fontFamily: Fonts.serif, fontSize: 14, fontStyle: 'italic', color: '#5B5470', textAlign: 'center' },
    cover: {
      ...StyleSheet.absoluteFillObject,
      transformOrigin: 'left center',
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
