import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Product } from '../lib/database';
import { Button } from './button';
import { ProductCard } from './product-card';
import { Fonts } from '../constants/theme';
import { useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

interface SectionCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isBestSeller?: boolean;
  featuredFirst?: boolean;
  onSeeAll?: () => void;
}

export const SectionCarousel = ({
  title,
  subtitle,
  products,
  isBestSeller = false,
  featuredFirst = false,
  onSeeAll,
}: SectionCarouselProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Animated.Text entering={FadeInDown.springify()} style={styles.title} accessibilityRole="header">{title}</Animated.Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onSeeAll ? (
          <Button label="Ver todo" accessibilityLabel={`Ver todo: ${title}`} variant="ghost" onPress={onSeeAll} />
        ) : null}
      </View>

      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.itemWrapper}>
            <ProductCard
              product={item}
              compact
              isBestSeller={isBestSeller}
              featured={featuredFirst && index === 0}
              index={index}
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: Fonts.serif,
    color: t.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: t.inkMuted,
    maxWidth: '80%',
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
