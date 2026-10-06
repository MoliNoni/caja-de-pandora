// Home Screen Component
// Main landing page with best-sellers
// Shows featured books and vinyl
// Modular sections and carousel support

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getLatestProducts,
  getTopBestSellers,
  Product,
} from '../../lib/database';
import { SectionCarousel } from '../../components/section-carousel';
import { ProfileMenu } from '../../components/profile-menu';
import { useCart } from '../../lib/cart-context';
import { useAuth } from '../../lib/auth-context';

// Home screen component
export default function HomeScreen() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { isAdmin } = useAuth();

  const [bestSellersBooks, setBestSellersBooks] = useState<Product[]>([]);
  const [bestSellersVinyls, setBestSellersVinyls] = useState<Product[]>([]);
  const [latestBooks, setLatestBooks] = useState<Product[]>([]);
  const [latestVinyls, setLatestVinyls] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

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

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showMenu ? 0 : -280,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showMenu, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Librería Caja de Pandora</Text>
          <Text style={styles.tagline}>Descubre tesoros literarios y musicales</Text>
        </View>
        <View style={styles.headerActions}>
          <ProfileMenu />
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart" size={24} color="#ffd700" />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showMenu && (
        <>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.drawerMenuWrapper,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <TouchableOpacity
              style={styles.drawerCloseButton}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerMenuItem}
              onPress={() => {
                router.push('/(tabs)/explore');
                setShowMenu(false);
              }}
            >
              <Ionicons name="book" size={24} color="#ffd700" />
              <Text style={styles.drawerMenuItemText}>Catálogo de Libros</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            <TouchableOpacity
              style={styles.drawerMenuItem}
              onPress={() => {
                router.push('/(tabs)/vinyl');
                setShowMenu(false);
              }}
            >
              <Ionicons name="musical-notes" size={24} color="#ffd700" />
              <Text style={styles.drawerMenuItemText}>Catálogo de Vinilos</Text>
            </TouchableOpacity>

            {isAdmin && (
              <>
                <View style={styles.drawerDivider} />

                <TouchableOpacity
                  style={styles.drawerMenuItem}
                  onPress={() => {
                    router.push('/admin' as any);
                    setShowMenu(false);
                  }}
                >
                  <Ionicons name="settings" size={24} color="#4b0082" />
                  <Text style={styles.drawerMenuItemText}>Administracion</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </>
      )}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#ffd700" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SectionCarousel
            title="Best Sellers en Libros"
            subtitle="Los títulos más demandados por nuestros clientes"
            products={bestSellersBooks}
            isBestSeller
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

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaCard}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.ctaTitle}>Explora libros</Text>
              <Text style={styles.ctaText}>Ver toda la colección de libros.</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaCard}
              onPress={() => router.push('/(tabs)/vinyl')}
            >
              <Text style={styles.ctaTitle}>Explora vinilos</Text>
              <Text style={styles.ctaText}>Descubre nuevos lanzamientos musicales.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuButton: {
    padding: 8,
  },
  logoContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  logo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tagline: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  drawerMenuWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: '#fff',
    paddingTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 1000,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawerCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  drawerMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
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
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  ctaCard: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
});
