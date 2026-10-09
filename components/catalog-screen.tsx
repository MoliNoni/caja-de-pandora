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
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
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

const GAP = 12;
// Header bar height (AppHeader: 40px buttons + 10px padding). The list scrolls under it.
const HEADER = 60;
type Row =
  | { type: 'genre'; key: string; genre: string; count: number }
  | { type: 'cards'; key: string; products: Product[]; start: number };

/** One section per genre (biggest first, untagged last), each chunked into grid rows; one virtualized list. */
const genreRows = (products: Product[], columns: number): Row[] => {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const genre = p.genero.trim() || 'Otros';
    groups.set(genre, [...(groups.get(genre) ?? []), p]);
  }
  const sorted = [...groups].sort(([a, x], [b, y]) =>
    (a === 'Otros' ? 1 : 0) - (b === 'Otros' ? 1 : 0) || y.length - x.length || a.localeCompare(b, 'es'));
  const rows: Row[] = [];
  let index = 0;
  for (const [genre, items] of sorted) {
    rows.push({ type: 'genre', key: `g:${genre}`, genre, count: items.length });
    for (let i = 0; i < items.length; i += columns) {
      rows.push({ type: 'cards', key: `c:${genre}:${i}`, products: items.slice(i, i + columns), start: index + i });
    }
    index += items.length;
  }
  return rows;
};

// Relay, never both at once: the large title leaves over OUT px of scroll, then the compact one enters over IN.
const OUT: [number, number] = [0, 30];
const IN: [number, number] = [26, 56];

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
  // As many ~220px columns as fit (2 on a phone): a fixed 2 made desktop cards 660px wide.
  // Measured content width: on desktop the scrollbar eats ~15px of the window.
  const windowWidth = useWindowDimensions().width;
  const [listWidth, setListWidth] = useState<number | null>(null);
  const width = listWidth ?? windowWidth;
  const columns = Math.max(2, Math.floor((width - 32) / 220));
  const cardWidth = (width - 32 - (columns - 1) * GAP) / columns;
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
  const [searchFocused, setSearchFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  // Everything is tied to the scroll offset, so it moves exactly with the finger (no timed animation).
  const largeTitleStyle = useAnimatedStyle((): ViewStyle => {
    const y = Math.max(scrollY.value, 0);
    const p = interpolate(y, OUT, [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 1 - p,
      // A little blur melts it into the frosted bar instead of a hard fade.
      filter: reducedMotion ? undefined : `blur(${p * 4}px)`,
      // Sinks a little slower than the content: it reads as sliding under the bar, not being cut by it.
      transform: reducedMotion
        ? []
        : [{ translateY: y * 0.35 }, { scale: 1 - 0.06 * p }],
    };
  });
  const compactTitleStyle = useAnimatedStyle((): ViewStyle => ({
    opacity: interpolate(scrollY.value, IN, [0, 1], Extrapolation.CLAMP),
    transform: reducedMotion
      ? []
      : [{ translateY: interpolate(scrollY.value, IN, [10, 0], Extrapolation.CLAMP) }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, IN[1]], [0, 1], Extrapolation.CLAMP),
  }));

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
  const rows = useMemo(() => genreRows(filteredProductos, columns), [filteredProductos, columns]);

  useFocusEffect(
    useCallback(() => {
      scrollY.value = 0; // the list remounts at the top, so the title starts undocked
      setVisit((v) => v + 1);
      loadProductos();
    }, [loadProductos, scrollY])
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

  const top = (
    <View>
      <Animated.View style={[styles.titleRow, largeTitleStyle]}>
        <DancingText text={title} style={styles.title} colors={category === 'vinyl' ? theme.gradients.vinyl : theme.gradients.books} />
      </Animated.View>
      <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
        <Text style={styles.searchLabel}>Buscar</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.inkMuted}
          accessibilityLabel="Buscar"
          value={searchQuery}
          onChangeText={handleSearch}
          ref={searchRef}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PatternBackground variant={category === 'vinyl' ? 'contours' : 'dots'} />
      <View style={styles.body}>
        {loading ? (
          <View style={styles.offset}>
            {top}
            <SkeletonRegion style={styles.skeletonGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} width="48%" />
              ))}
            </SkeletonRegion>
          </View>
        ) : (
          <>
            <View style={styles.refreshAnchor}>
              <RefreshRecord scrollY={scrollY} refreshing={refreshing} color={theme.accent} />
            </View>
            <Animated.FlatList
              key={`${visit}-${columns}`}
              onScroll={onScroll}
              scrollEventThrottle={16}
              data={rows}
              onContentSizeChange={(w) => w !== listWidth && setListWidth(w)}
              renderItem={({ item }) =>
                item.type === 'genre' ? (
                  <View style={styles.genreHeader}>
                    <Text style={styles.genreTitle} accessibilityRole="header">{item.genre}</Text>
                    <Text style={styles.genreCount}>{item.count}</Text>
                  </View>
                ) : (
                  <View style={styles.columnWrapper}>
                    {item.products.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={item.start + i} width={cardWidth} />
                    ))}
                  </View>
                )
              }
              keyExtractor={(item) => item.key}
              ListHeaderComponent={
                <>
                  {top}
                  {filteredProductos.length > 0 ? (
                    <Text style={styles.resultCount}>
                      {filteredProductos.length} producto{filteredProductos.length !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle} accessibilityRole="header">{emptyTitle}</Text>
                  <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
                </View>
              }
              contentContainerStyle={[styles.listContent, styles.offset]}
              refreshControl={
                // Stock spinner hidden: RefreshRecord is the indicator.
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['transparent']}
                  tintColor="transparent"
                  progressBackgroundColor="transparent"
                  progressViewOffset={HEADER}
                />
              }
            />
          </>
        )}

        {/* Bar over the list: turns into frosted glass as content slides under it, and receives the title. */}
        <View style={styles.headerLayer} pointerEvents="box-none">
          <Animated.View style={[styles.bar, barStyle]} pointerEvents="none" />
          <Animated.View style={[styles.compactTitle, compactTitleStyle]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <DancingText text={title} style={styles.compactTitleText} colors={category === 'vinyl' ? theme.gradients.vinyl : theme.gradients.books} wave={false} />
          </Animated.View>
          <AppHeader />
        </View>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  body: { flex: 1 },
  offset: { paddingTop: HEADER },
  refreshAnchor: { position: 'absolute', top: HEADER, left: 0, right: 0, zIndex: 2 },
  headerLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: HEADER, zIndex: 3 },
  bar: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${t.bg}D9`,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
    // Frosted glass on web; native keeps the translucent tint.
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px)' } as object) : null),
  },
  compactTitle: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  compactTitleText: { fontSize: 20, lineHeight: 24, fontWeight: '500', fontFamily: Fonts.serif, letterSpacing: -0.4, color: t.ink },
  titleRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, alignSelf: 'flex-start', transformOrigin: 'left top' },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    fontWeight: '500',
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: t.surface,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.inkMuted,
  },
  // The input drops the browser outline; focus shows on the hairline frame instead.
  searchContainerFocused: { borderColor: t.accent },
  searchLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase',
    color: t.accent,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: t.ink,
    // Chrome draws `outline-style: auto` even at width 0; 'none' is valid CSS but missing from RN types.
    ...({ outlineStyle: 'none' } as object),
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
    fontSize: 22,
    fontWeight: '500',
    fontFamily: Fonts.serif,
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
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: 8,
  },
  genreHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: 8,
    marginTop: 12,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.inkMuted,
  },
  genreTitle: { fontSize: 22, fontWeight: '500', fontFamily: Fonts.serif, letterSpacing: -0.4, color: t.ink, textTransform: 'capitalize' },
  genreCount: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, color: t.inkMuted },
  resultCount: {
    fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase',
    color: t.inkMuted,
    marginHorizontal: 8,
    marginTop: 12,
    marginBottom: 16,
  },
});
