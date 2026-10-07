// Catalog Screen Component
// Shows product catalog with search and filtering
// Handles product loading and refresh
// Shows cart with item count
// Manages search and product filtering

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProductos, Product } from '../lib/database';
import { PatternBackground } from './pattern-background';
import { DancingText } from './dancing-text';
import { ProductCard } from './product-card';
import { ProfileMenu } from './profile-menu';
import { useCart } from '../lib/cart-context';
import { SkeletonCard, SkeletonRegion } from './skeleton';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';

type CatalogScreenProps = {
  category: 'book' | 'vinyl';
  title: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptySubtitle: string;
};

// Main catalog component that displays products in a grid
export const CatalogScreen = ({
  category,
  title,
  searchPlaceholder,
  emptyTitle,
  emptySubtitle,
}: CatalogScreenProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { itemCount } = useCart();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const searchRef = useRef<TextInput>(null);

  // Tabs stay mounted, so autoFocus only works on the first visit: focus on every hero entry,
  // then clear the param so the next entry changes it again.
  useFocusEffect(
    useCallback(() => {
      if (focus !== 'search') return;
      searchRef.current?.focus();
      router.setParams({ focus: undefined });
    }, [focus, router])
  );
  const [productos, setProductos] = useState<Product[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      <PatternBackground variant={category === 'vinyl' ? 'contours' : 'dots'} />
      <View style={styles.header}>
        <DancingText text={title} style={styles.title} containerStyle={styles.titleRow} />
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

      <View style={styles.searchContainer}>
        <Text style={styles.searchLabel}>Buscar</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.inkMuted}
          accessibilityLabel="Buscar"
          value={searchQuery}
          onChangeText={handleSearch}
          ref={searchRef}
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
          <Text style={styles.emptyTitle} accessibilityRole="header">{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProductos}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item, index }) => <ProductCard product={item} index={index} />}
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
  },
  titleRow: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    fontWeight: '800',
    fontFamily: Fonts.serif,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: t.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.inkMuted,
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
});
