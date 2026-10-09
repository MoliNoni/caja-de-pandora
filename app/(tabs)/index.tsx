// Home Screen Component
// Main landing page with best-sellers
// Shows featured books and vinyl
// Modular sections and carousel support

import { WeeklyPick } from '../../components/weekly-pick';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { getHomeData, getRecommendations, type HomeData, type Product } from '../../lib/database';
import { useAuth } from '../../lib/auth-context';
import { useCachedState } from '../../lib/cache';
import { PatternBackground } from '../../components/pattern-background';
import { SectionCarousel } from '../../components/section-carousel';
import { HeroButton } from '../../components/hero-button';
import { DancingText } from '../../components/dancing-text';
import { AppHeader } from '../../components/app-header';
import { Skeleton, SkeletonCard, SkeletonRegion } from '../../components/skeleton';
import { useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

const HERO_FADE = 260;
// Header bar height (AppHeader: 40px buttons + 10px padding). The page scrolls under it.
const HEADER = 60;
// The compact title docks in the bar as the large one finishes leaving.
const DOCK: [number, number] = [HERO_FADE - 70, HERO_FADE];
const TICKER_PX_S = 28;

/** Tracked-caps line of genres drifting sideways, like a shop-front ticker. */
function GenreTicker({ products }: { products: Product[] }) {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const line = useMemo(
    () => [...new Set(products.map((p) => p.genero.trim()).filter(Boolean))].join('   ·   '),
    [products]
  );
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion || width === 0) return;
    x.value = 0;
    x.value = withRepeat(withTiming(-width, { duration: (width / TICKER_PX_S) * 1000, easing: Easing.linear }), -1);
    return () => cancelAnimation(x);
  }, [reducedMotion, width, x]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (!line) return null;
  // Two copies side by side: when the first has fully left, the loop restarts on an identical frame.
  const copy = `${line}   ·   `;
  return (
    <View style={styles.ticker} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.tickerTrack, move]}>
        <Text style={styles.tickerText} numberOfLines={1} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>{copy}</Text>
        <Text style={styles.tickerText} numberOfLines={1}>{copy}</Text>
      </Animated.View>
    </View>
  );
}

// Home screen component
export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const [home, setHome] = useCachedState<HomeData>('home');
  const { user } = useAuth();
  const [forYou, setForYou] = useState<Product[]>([]);
  const loading = home === undefined;
  // Bumped on every visit: remounting the sections replays their entrance each time.
  const [visit, setVisit] = useState(0);

  // Scroll-linked hero: the title spreads and the hero fades over the first HERO_FADE px;
  // the aurora drifts up slower than the content (parallax).
  const reducedMotion = useReducedMotion();
  // Own value, reset on every visit: the ScrollView remounts at the top (key={visit}), and a
  // stale offset from the last visit would leave the hero faded out and the title spread.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // The title leaves as one composed block, like the catalog titles: it sinks a little slower
  // than the page, dims, softens and shrinks a touch, then the compact one docks in the bar.
  const heroStyle = useAnimatedStyle((): ViewStyle => {
    const y = Math.max(scrollY.value, 0);
    const p = interpolate(y, [0, HERO_FADE], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 1 - p,
      filter: reducedMotion ? undefined : `blur(${p * 6}px)`,
      transform: reducedMotion ? [] : [{ translateY: y * 0.3 }, { scale: 1 - 0.08 * p }],
    };
  });
  const compactTitleStyle = useAnimatedStyle((): ViewStyle => ({
    opacity: interpolate(scrollY.value, DOCK, [0, 1], Extrapolation.CLAMP),
    transform: reducedMotion
      ? []
      : [{ translateY: interpolate(scrollY.value, DOCK, [10, 0], Extrapolation.CLAMP) }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, DOCK[1]], [0, 1], Extrapolation.CLAMP),
  }));
  const auroraStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [{ translateY: reducedMotion ? 0 : -Math.min(Math.max(scrollY.value, 0) * 0.15, 90) }],
  }));

  const loadHomeData = useCallback(async () => {
    try {
      setHome(await getHomeData());
    } catch (error) {
      console.error('Error loading home data:', error);
    }
    setForYou(user ? await getRecommendations() : []);
  }, [setHome, user]);

  useFocusEffect(
    useCallback(() => {
      scrollY.value = 0;
      setVisit((v) => v + 1);
      loadHomeData();
    }, [loadHomeData, scrollY])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, auroraStyle]} pointerEvents="none">
        <PatternBackground />
      </Animated.View>
      <View style={styles.body}>
      {loading || !home ? (
        <SkeletonRegion style={styles.scrollContent}>
          {[0, 1].map((row) => (
            <View key={row} style={styles.skeletonSection}>
              <Skeleton height={20} width="50%" style={styles.skeletonTitle} />
              <View style={styles.skeletonRow}>
                {[0, 1, 2].map((card) => (
                  <SkeletonCard key={card} width={180} />
                ))}
              </View>
            </View>
          ))}
        </SkeletonRegion>
      ) : (
        <Animated.ScrollView onScroll={onScroll} key={visit} contentContainerStyle={styles.scrollContent} scrollEventThrottle={16}>
          <Animated.View style={[styles.hero, heroStyle]}>
            <DancingText text="Caja de Pandora" style={styles.heroTitle} record={10} />
            <Animated.View entering={FadeInDown.delay(380).duration(700)}>
              <HeroButton
                label="Buscar en el catálogo"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/explore', params: { focus: 'search' } } as any)
                }
              />
            </Animated.View>
          </Animated.View>

          <GenreTicker products={[...home.books, ...home.vinyls, ...home.newBooks, ...home.newVinyls]} />

          <WeeklyPick books={[...home.books, ...home.newBooks]} vinyls={[...home.vinyls, ...home.newVinyls]} />

          {forYou.length > 0 && (
            <SectionCarousel kicker="Para ti" title="Según tus compras" products={forYou} />
          )}

          <SectionCarousel
            kicker="Libros"
            title="Los más vendidos"
            products={home.books}
            isBestSeller
            featuredFirst
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            kicker="Libros"
            title="Recién llegados"
            products={home.newBooks}
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            kicker="Vinilos"
            title="Los más vendidos"
            products={home.vinyls}
            isBestSeller
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />

          <SectionCarousel
            kicker="Vinilos"
            title="Recién llegados"
            products={home.newVinyls}
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />
        </Animated.ScrollView>
      )}

        {/* Same docking bar as the catalogs: frosted once content slides under it, and receives the title. */}
        <View style={styles.headerLayer} pointerEvents="box-none">
          <Animated.View style={[styles.bar, barStyle]} pointerEvents="none" />
          <Animated.View style={[styles.compactTitle, compactTitleStyle]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <DancingText text="Caja de Pandora" style={styles.compactTitleText} wave={false} />
          </Animated.View>
          <AppHeader />
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  body: { flex: 1 },
  headerLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: HEADER, zIndex: 3 },
  bar: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${t.bg}D9`,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px)' } as object) : null),
  },
  compactTitle: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  compactTitleText: { fontSize: 20, lineHeight: 24, fontWeight: '500', fontFamily: Fonts.serif, letterSpacing: -0.4, color: t.ink },
  ticker: {
    overflow: 'hidden',
    marginHorizontal: -8,
    marginBottom: 32,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: t.border,
  },
  tickerTrack: { flexDirection: 'row', alignSelf: 'flex-start' },
  tickerText: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.inkMuted },
  skeletonSection: {
    marginVertical: 10,
  },
  skeletonTitle: {
    marginHorizontal: 8,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 8,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: HEADER + 8,
    // Clears the floating tab bar (68 tall + 12 offset) with a small gap.
    paddingBottom: 92,
  },
  hero: {
    marginHorizontal: 8,
    marginTop: 32,
    marginBottom: 40,
    gap: 28,
    alignItems: 'flex-start',
    transformOrigin: 'left top',
  },
  heroTitle: {
    fontSize: 68,
    lineHeight: 72,
    letterSpacing: -1.5,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
  },
});
