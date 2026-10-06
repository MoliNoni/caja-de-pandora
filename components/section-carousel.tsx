import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Product } from '../lib/database';
import { ProductCard } from './product-card';
import { useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

interface SectionCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isBestSeller?: boolean;
  onSeeAll?: () => void;
}

export const SectionCarousel = ({
  title,
  subtitle,
  products,
  isBestSeller = false,
  onSeeAll,
}: SectionCarouselProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onSeeAll ? (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
            <Text style={styles.seeAllText}>Ver todo</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <ProductCard
              product={item}
              compact
              isBestSeller={isBestSeller}
            />
          </View>
        )}
        contentContainerStyle={styles.carouselContent}
      />

      {products.length === 0 && (
        <Text style={styles.emptyText}>No hay productos disponibles aún.</Text>
      )}
    </View>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  section: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: t.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: t.inkMuted,
    maxWidth: '80%',
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: t.accent,
  },
  seeAllText: {
    color: t.onAccent,
    fontWeight: '700',
    fontSize: 12,
  },
  carouselContent: {
    paddingLeft: 8,
    paddingRight: 12,
  },
  itemWrapper: {
    marginRight: 12,
  },
  emptyText: {
    marginHorizontal: 8,
    color: t.inkMuted,
    fontSize: 13,
  },
});
