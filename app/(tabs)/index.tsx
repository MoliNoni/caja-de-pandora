// Home Screen Component
// Main landing page with best-sellers
// Shows featured books and vinyl
// Modular sections and carousel support

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getLatestProducts,
  getTopBestSellers,
  Product,
} from '../../lib/database';
import { PatternBackground } from '../../components/pattern-background';
import { SectionCarousel } from '../../components/section-carousel';
import { HeroButton } from '../../components/hero-button';
import { ProfileMenu } from '../../components/profile-menu';
import { useCart } from '../../lib/cart-context';
import { Skeleton, SkeletonCard, SkeletonRegion } from '../../components/skeleton';
import { useTheme, useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

// Home screen component
export default function HomeScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { itemCount } = useCart();

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
              <View style={styles.cartBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
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
            <Text style={styles.heroTitle} accessibilityRole="header">
              Libros y vinilos con historia
            </Text>
            <Text style={styles.heroText}>Descubre tesoros literarios y musicales.</Text>
            <HeroButton
              label="Buscar en el catálogo"
              onPress={() =>
                router.push({ pathname: '/(tabs)/explore', params: { focus: 'search' } } as any)
              }
            />
          </View>

          <SectionCarousel
            title="Best Sellers en Libros"
            subtitle="Los títulos más demandados por nuestros clientes"
            products={bestSellersBooks}
            isBestSeller
            featuredFirst
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            title="Novedades en Libros"
            subtitle="Los lanzamientos más recientes ordenados por fecha"
            products={latestBooks}
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <SectionCarousel
            title="Best Sellers en Vinilos"
            subtitle="Los discos más vendidos y recomendados"
            products={bestSellersVinyls}
            isBestSeller
            onSeeAll={() => router.push('/(tabs)/vinyl')}
          />

          <SectionCarousel
            title="Novedades en Vinilos"
            subtitle="Los vinilos recién agregados a la tienda"
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
    backgroundColor: t.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  logoContainer: {
    flex: 1,
    marginRight: 12,
  },
  logo: {
    fontSize: 16,
    fontWeight: 'bold',
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
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  heroText: {
    fontSize: 15,
    color: t.inkMuted,
  },
});
