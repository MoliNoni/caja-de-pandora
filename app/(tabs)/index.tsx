// Home Screen Component
// Main landing page with best-sellers
// Shows featured books and vinyl
// Modular sections and carousel support

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getLatestProducts,
  getTopBestSellers,
  prefetchCatalog,
  Product,
} from '../../lib/database';
import { PatternBackground } from '../../components/pattern-background';
import { SectionCarousel } from '../../components/section-carousel';
import { HeroButton } from '../../components/hero-button';
import { DancingText } from '../../components/dancing-text';
import { ProfileMenu } from '../../components/profile-menu';
import { useCart } from '../../lib/cart-context';
import { Skeleton, SkeletonCard, SkeletonRegion } from '../../components/skeleton';
import { useTheme, useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

/** Decorative record that keeps turning beside the hero title. */
function SpinningRecord({ size }: { size: number }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    turn.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1);
    return () => cancelAnimation(turn);
  }, [reducedMotion, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const r = size / 2;
  return (
    <Animated.View style={spin} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r} fill="#111" />
        {[0.5, 0.62, 0.74, 0.86, 0.95].map((k) => (
          <Circle key={k} cx={r} cy={r} r={r * k} fill="none" stroke="#2C2C2C" strokeWidth={1} />
        ))}
        <Circle cx={r} cy={r} r={r * 0.36} fill={theme.vivid[0]} />
        <Circle cx={r * 1.12} cy={r * 0.86} r={r * 0.1} fill={theme.vivid[2]} />
        <Circle cx={r} cy={r} r={r * 0.06} fill={theme.bg} />
      </Svg>
    </Animated.View>
  );
}

/** Cart icon that pops whenever the item count grows. */
function useBadgePop(count: number) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion || count === 0) return;
    scale.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 220 }));
  }, [count, reducedMotion, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// Home screen component
export default function HomeScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { itemCount } = useCart();
  const badgePop = useBadgePop(itemCount);

  const [bestSellersBooks, setBestSellersBooks] = useState<Product[]>([]);
  const [bestSellersVinyls, setBestSellersVinyls] = useState<Product[]>([]);
  const [latestBooks, setLatestBooks] = useState<Product[]>([]);
  const [latestVinyls, setLatestVinyls] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHomeData = useCallback(async () => {
    try {
      const [books, vinyls, newBooks, newVinyls] = await Promise.all([
        getTopBestSellers('book'),
        getTopBestSellers('vinyl'),
        getLatestProducts('book'),
        getLatestProducts('vinyl'),
      ]);

      setBestSellersBooks(books);
      setBestSellersVinyls(vinyls);
      setLatestBooks(newBooks);
      setLatestVinyls(newVinyls);
      // Warm both catalog tabs while the user is on the home screen.
      void prefetchCatalog('book').catch(() => undefined);
      void prefetchCatalog('vinyl').catch(() => undefined);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground />
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo} accessibilityRole="header">Librería Caja de Pandora</Text>
        </View>
        <View style={styles.headerActions}>
          <ProfileMenu />
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
            accessibilityRole="link"
            accessibilityLabel={itemCount > 0 ? `Carrito, ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}` : 'Carrito'}
            hitSlop={4}
          >
            <Ionicons name="cart" size={24} color={theme.accent} />
            {itemCount > 0 && (
              <Animated.View style={[styles.cartBadge, badgePop]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Animated.Text entering={FadeInDown.springify()} style={styles.eyebrow}>
                LIBROS · VINILOS · DESDE SIEMPRE
              </Animated.Text>
              <SpinningRecord size={64} />
            </View>
            <DancingText text="Caja de Pandora" style={styles.heroTitle} delay={150} />
            <Animated.Text entering={FadeInDown.delay(800).springify()} style={styles.heroText}>
              Ábrela: historias que se leen y discos que giran.
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(1000).springify()}>
              <HeroButton
                label="Buscar en el catálogo"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/explore', params: { focus: 'search' } } as any)
                }
              />
            </Animated.View>
          </View>

          <SectionCarousel
            title="Best Sellers en Libros"
            products={bestSellersBooks}
            isBestSeller
            featuredFirst
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            title="Novedades en Libros"
            products={latestBooks}
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            title="Best Sellers en Vinilos"
            products={bestSellersVinyls}
            isBestSeller
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />

          <SectionCarousel
            title="Novedades en Vinilos"
            products={latestVinyls}
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  logoContainer: {
    flex: 1,
    marginRight: 12,
  },
  logo: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.serif,
    letterSpacing: -0.3,
    color: t.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: t.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: t.onAccent,
    fontSize: 12,
    fontWeight: 'bold',
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
    paddingVertical: 8,
  },
  hero: {
    marginHorizontal: 8,
    marginTop: 24,
    marginBottom: 32,
    gap: 16,
    alignItems: 'flex-start',
  },
  heroTop: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: t.inkMuted,
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
