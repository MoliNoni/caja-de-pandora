import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { Product } from '../lib/database';
import { Button } from './button';
import { ProductCard } from './product-card';
import { Fonts } from '../constants/theme';
import { useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

const DRIFT_PX_S = 22; // slow auto-scroll speed
const EDGE_PAUSE_MS = 1500; // rest at each end before turning back
const USER_PAUSE_MS = 4000; // hands-off time after the user scrolls

/**
 * Drifts a horizontal list back and forth while nobody touches it.
 * Any scroll we did not cause (drag, wheel, keyboard) or a hover pauses it.
 */
function useDrift(list: React.RefObject<FlatList<Product> | null>) {
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const s = useRef({ x: 0, max: 0, viewport: 0, content: 0, dir: 1, pausedUntil: 0, hover: false }).current;

  useEffect(() => {
    if (reducedMotion || !focused) return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(now - last, 64);
      last = now;
      if (!s.hover && now > s.pausedUntil && s.max > 0) {
        s.x += (s.dir * DRIFT_PX_S * dt) / 1000;
        if (s.x >= s.max || s.x <= 0) {
          s.x = Math.max(0, Math.min(s.x, s.max));
          s.dir = -s.dir;
          s.pausedUntil = now + EDGE_PAUSE_MS;
        }
        list.current?.scrollToOffset({ offset: s.x, animated: false });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, focused, list, s]);

  const measure = () => (s.max = Math.max(0, s.content - s.viewport));
  return {
    onLayout: (e: { nativeEvent: { layout: { width: number } } }) => {
      s.viewport = e.nativeEvent.layout.width;
      measure();
    },
    onContentSizeChange: (w: number) => {
      s.content = w;
      measure();
    },
    // Our own steps land within a pixel (scroll positions round); anything farther is the user.
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      if (Math.abs(x - s.x) > 2) {
        s.x = x;
        s.pausedUntil = performance.now() + USER_PAUSE_MS;
      }
    },
    onPointerEnter: () => (s.hover = true),
    onPointerLeave: () => (s.hover = false),
  };
}

interface SectionCarouselProps {
  title: string;
  /** Tracked-caps line above the title, e.g. "Libros". */
  kicker?: string;
  subtitle?: string;
  products: Product[];
  featuredFirst?: boolean;
  onSeeAll?: () => void;
}

export const SectionCarousel = ({
  title,
  kicker,
  subtitle,
  products,
  featuredFirst = false,
  onSeeAll,
}: SectionCarouselProps) => {
  const styles = useThemedStyles(makeStyles);
  const listRef = useRef<FlatList<Product>>(null);
  const { onPointerEnter, onPointerLeave, ...drift } = useDrift(listRef);
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onSeeAll ? (
          <Button label="Ver todo" accessibilityLabel={`Ver todo: ${kicker ? `${kicker}, ` : ''}${title}`} variant="ghost" onPress={onSeeAll} />
        ) : null}
      </View>

      <View onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <FlatList
        ref={listRef}
        {...drift}
        scrollEventThrottle={16}
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.itemWrapper}>
            <ProductCard
              product={item}
              compact
              featured={featuredFirst && index === 0}
            />
          </View>
        )}
        contentContainerStyle={styles.carouselContent}
      />
      </View>

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
    // Air between the heading and the cards: the title needs room to read as a heading.
    marginBottom: 18,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: t.accent,
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
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
