// Catalog Screen Component
// Shows product catalog with search and filtering
// Handles product loading and refresh
// Shows cart with item count
// Manages search and product filtering

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getProductos, Product } from '../lib/database';
import { useCachedState } from '../lib/cache';
import { PatternBackground } from './pattern-background';
import { DancingText } from './dancing-text';
import { ProductCard } from './product-card';
import { AppHeader } from './app-header';
import { SkeletonCard, SkeletonRegion } from './skeleton';
import { RefreshRecord } from './refresh-record';
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
  const [cached, setProductos] = useCachedState<Product[]>(`catalog:${category}`);
  const productos = useMemo(() => cached ?? [], [cached]);
  const loading = cached === undefined;
  // Bumped on every visit: remounting the list replays the card entrance each time.
  const [visit, setVisit] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
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
      setProductos(await getProductos(category));
    } catch (error) {
      console.error('Error loading productos:', error);
    } finally {
      setRefreshing(false);
    }
  }, [category, setProductos]);

  const filteredProductos = useMemo(
    () => filterProducts(productos, searchQuery),
    [filterProducts, productos, searchQuery]
  );

  useFocusEffect(
    useCallback(() => {
      setVisit((v) => v + 1);
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground variant={category === 'vinyl' ? 'contours' : 'dots'} />
      <AppHeader />
      <DancingText
        text={title}
        style={styles.title}
        containerStyle={styles.titleRow}
        colors={category === 'vinyl' ? theme.gradients.vinyl : theme.gradients.books}
      />

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
        <View style={styles.listArea}>
        <RefreshRecord scrollY={scrollY} refreshing={refreshing} color={theme.accent} />
        <Animated.FlatList
          key={visit}
          onScroll={onScroll}
          scrollEventThrottle={16}
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
            // Stock spinner hidden: RefreshRecord is the indicator.
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['transparent']}
              tintColor="transparent"
              progressBackgroundColor="transparent"
            />
          }
        />
        </View>
      )}
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  listArea: { flex: 1 },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
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
    paddingTop: 8,
    // Clears the floating tab bar (68 tall + 12 offset) with a small gap.
    paddingBottom: 92,
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
