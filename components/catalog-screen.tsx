// Catalog Screen Component
// Shows product catalog with search and filtering
// Handles product loading and refresh
// Has animated side drawer for navigation
// Shows cart with item count
// Manages search and product filtering

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProductos, Product } from '../lib/database';
import { ProductCard } from './product-card';
import { ProfileMenu } from './profile-menu';
import { useCart } from '../lib/cart-context';
import { useAuth } from '../lib/auth-context';
import { SkeletonCard, SkeletonRegion } from './skeleton';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

type CatalogScreenProps = {
  category: 'book' | 'vinyl';
  title: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptySubtitle: string;
  showNavigation?: boolean;
};

// Main catalog component that displays products in a grid
export const CatalogScreen = ({
  category,
  title,
  searchPlaceholder,
  emptyTitle,
  emptySubtitle,
  showNavigation = true,
}: CatalogScreenProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { itemCount } = useCart();
  const { isAdmin } = useAuth();
  const [productos, setProductos] = useState<Product[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  // Handle menu animation
  useEffect(() => {
    if (showMenu) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [showMenu, slideAnim]);

  // Filter products based on search query
  const filterProducts = useCallback((items: Product[], query: string) => {
    if (query.trim() === '') {
      return items;
    }

    const lowercaseQuery = query.toLowerCase();
    return items.filter(
      (product) =>
        product.titulo.toLowerCase().includes(lowercaseQuery) ||
        product.autor?.toLowerCase().includes(lowercaseQuery) ||
        product.genero?.toLowerCase().includes(lowercaseQuery)
    );
  }, []);

  // Load products from database
  const loadProductos = useCallback(async () => {
    try {
      const data = await getProductos(category);
      setProductos(data);
      setFilteredProductos(filterProducts(data, searchQuery));
    } catch (error) {
      console.error('Error loading productos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, filterProducts, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadProductos();
    }, [loadProductos])
  );

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadProductos();
  };

  // Update search and filter products
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFilteredProductos(filterProducts(productos, text));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Ionicons name="menu" size={24} color={theme.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerActions}>
          <ProfileMenu />
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="cart" size={24} color={theme.accent} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showMenu && showNavigation && (
        <>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <Animated.View style={[styles.drawerMenuWrapper, { transform: [{ translateX: slideAnim }] }]}>
            <TouchableOpacity
              style={styles.drawerCloseButton}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close" size={28} color={theme.ink} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerMenuItem}
              onPress={() => {
                router.push('/');
                setShowMenu(false);
              }}
            >
              <Ionicons name="home" size={24} color={theme.accent} />
              <Text style={styles.drawerMenuItemText}>Inicio</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            {category === 'book' ? (
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  router.push('/vinyl');
                  setShowMenu(false);
                }}
              >
                <Ionicons name="musical-notes" size={24} color={theme.accent} />
                <Text style={styles.drawerMenuItemText}>Catálogo de Vinilos</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  router.push('/explore');
                  setShowMenu(false);
                }}
              >
                <Ionicons name="book" size={24} color={theme.accent} />
                <Text style={styles.drawerMenuItemText}>Catálogo de Libros</Text>
              </TouchableOpacity>
            )}

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
                  <Ionicons name="settings" size={24} color={theme.accent} />
                  <Text style={styles.drawerMenuItemText}>Administracion</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </>
      )}

      <View style={styles.searchContainer}>
        <Text style={styles.searchLabel}>Buscar</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.inkMuted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <SkeletonRegion style={styles.skeletonGrid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} width="48%" />
          ))}
        </SkeletonRegion>
      ) : filteredProductos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProductos}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => <ProductCard product={item} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filteredProductos.length} producto
              {filteredProductos.length !== 1 ? 's' : ''}
            </Text>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

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
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: t.ink,
    flex: 1,
    textAlign: 'center',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: t.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.border,
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.inkMuted,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: t.ink,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: t.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: t.inkMuted,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  resultCount: {
    fontSize: 12,
    color: t.inkMuted,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  drawerMenuWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: t.surface,
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
    backgroundColor: t.scrim,
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
    color: t.ink,
    marginLeft: 16,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: 8,
  },
});
