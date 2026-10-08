// Home Screen Component
// Main landing page with best-sellers
// Shows featured books and vinyl
// Modular sections and carousel support

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, SafeAreaView, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { getHomeData, type HomeData } from '../../lib/database';
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

// Home screen component
export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const [home, setHome] = useCachedState<HomeData>('home');
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
  const spread = useDerivedValue(() =>
    reducedMotion ? 0 : interpolate(scrollY.value, [0, HERO_FADE], [0, 1], Extrapolation.CLAMP)
  );
  const heroStyle = useAnimatedStyle((): ViewStyle => ({
    opacity: 1 - 0.85 * spread.value,
    transform: [{ translateY: scrollY.value * 0.35 * (reducedMotion ? 0 : 1) }],
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
  }, [setHome]);

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
      <AppHeader />

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
            <DancingText text="Caja de Pandora" style={styles.heroTitle} spread={spread} record={10} />
            <Animated.Text entering={FadeInDown.delay(250).springify()} style={styles.heroText}>
              Historias que se leen y escuchan
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(380).springify()}>
              <HeroButton
                label="Buscar en el catálogo"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/explore', params: { focus: 'search' } } as any)
                }
              />
            </Animated.View>
          </Animated.View>

          <SectionCarousel
            title="Best Sellers en Libros"
            products={home.books}
            isBestSeller
            featuredFirst
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            title="Novedades en Libros"
            products={home.newBooks}
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            title="Best Sellers en Vinilos"
            products={home.vinyls}
            isBestSeller
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />

          <SectionCarousel
            title="Novedades en Vinilos"
            products={home.newVinyls}
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
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
    paddingTop: 8,
    // Clears the floating tab bar (68 tall + 12 offset) with a small gap.
    paddingBottom: 92,
  },
  hero: {
    marginHorizontal: 8,
    marginTop: 24,
    marginBottom: 32,
    gap: 16,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -2,
    fontWeight: '800',
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  heroText: {
    fontSize: 18,
    lineHeight: 26,
    color: t.inkMuted,
    maxWidth: 420,
  },
});
