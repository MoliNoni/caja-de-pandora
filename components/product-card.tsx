// Product Card Component
// Shows individual product info in a card
// Displays image, title, author, price
// Handles adding to cart
// Shows best-seller badges

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Button } from './button';
import { useCart } from '../lib/cart-context';
import { useBurst } from './pixel-burst';
import { useFlyToCart } from './fly-to-cart';
import { Product, productCache } from '../lib/database';
import { peekProductImageUrl, resolveProductImageUrl } from '../lib/product-image';
import { getBookSynopsis } from '../lib/book-info';
import { getDiscogsTracklist } from '../lib/discogs';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';


interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  isBestSeller?: boolean;
  compact?: boolean;
  featured?: boolean;
  /** Position in its list: staggers the entrance. */
  index?: number;
  /** Grid cell width; the grid owner knows how many columns fit. */
  width?: number;
}

// Product card component
export const ProductCard = ({
  product,
  onPress,
  isBestSeller = false,
  compact = false,
  featured = false,
  index = 0,
  width,
}: ProductCardProps) => {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const lift = useSharedValue(0);
  // Cursor position over the card, -1..1 on each axis (web only).
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const liftStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [
      { perspective: 800 },
      { translateY: -6 * lift.value },
      { rotateX: `${-7 * tiltY.value}deg` },
      { rotateY: `${7 * tiltX.value}deg` },
      { scale: 1 + 0.02 * lift.value },
    ],
  }));
  // Glare follows the cursor across the card.
  const glareStyle = useAnimatedStyle((): ViewStyle => ({
    opacity: 0.35 * lift.value,
    transform: [{ translateX: `${50 * tiltX.value}%` }, { translateY: `${50 * tiltY.value}%` }],
  }));
  const spring = { damping: 14, stiffness: 220 };
  const hover = (on: boolean) => {
    if (reducedMotion) return;
    lift.value = withSpring(on ? 1 : 0, spring);
    if (!on) {
      tiltX.value = withSpring(0, spring);
      tiltY.value = withSpring(0, spring);
    }
  };
  const tilt =
    Platform.OS === 'web' && !reducedMotion
      ? (e: { nativeEvent: { clientX: number; clientY: number }; currentTarget: unknown }) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          tiltX.value = withSpring(((e.nativeEvent.clientX - r.left) / r.width) * 2 - 1, spring);
          tiltY.value = withSpring(((e.nativeEvent.clientY - r.top) / r.height) * 2 - 1, spring);
        }
      : undefined;
  const { addItem } = useCart();
  const theme = useTheme();
  const burst = useBurst();
  const fly = useFlyToCart();
  const burstColors = product.category === 'vinyl' ? theme.gradients.vinyl : theme.gradients.books;
  const router = useRouter();
  // undefined = cover still loading (neutral block), null = no cover exists.
  const [imageUri, setImageUri] = useState<string | null | undefined>(() => peekProductImageUrl(product));
  const openDetail =
    onPress ??
    (() => {
      productCache.set(product.id, { ...product, imageUrl: imageUri ?? product.imageUrl });
      router.push({ pathname: '/product/[id]', params: { id: product.id } });
    });

  // Warm the detail page's slow lookups (both memoized) so they're usually done when it opens.
  const prefetch = () => {
    if (product.category === 'book') void getBookSynopsis(product);
    else if (product.discogs_id) void getDiscogsTracklist(product.discogs_id);
  };

  // Load product cover image
  useEffect(() => {
    const fetchImage = async () => {
      setImageUri(await resolveProductImageUrl(product));
    };
    fetchImage();
  }, [product]);

  // Add product to cart
  const handleAddToCart = (e: GestureResponderEvent) => {
    burst(e, burstColors, 'lg');
    fly(e, imageUri);
    void addItem(product, 1);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 70).springify().damping(14)}
      style={[
        styles.container,
        compact && styles.compactContainer,
        width !== undefined && { width },
        featured && styles.featuredContainer,
        liftStyle,
      ]}
    >
      {/* Hover-only wrapper (web): not focusable, no action of its own. */}
      <Pressable
        focusable={false}
        accessible={false}
        onHoverIn={() => {
          hover(true);
          prefetch();
        }}
        onHoverOut={() => hover(false)}
        onPointerMove={tilt}
      >
      <TouchableOpacity
        onPressIn={prefetch}
        onPress={(e) => {
          burst(e, burstColors, 'md');
          openDetail();
        }}
        style={styles.imageContainer}
        accessibilityRole="link"
        accessibilityLabel={`Ver detalle de ${product.titulo}`}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            {imageUri === null && <Text style={styles.placeholderText}>Sin imagen</Text>}
          </View>
        )}
        {isBestSeller && (
          <View style={styles.bestSellerBadge}>
            <Text style={styles.bestSellerText}>Best Seller</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {product.titulo}
        </Text>

        {/* Optional lines keep their slot (blank) so every card has the same height. */}
        <Text style={styles.autor} numberOfLines={1}>
          {product.autor || ' '}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>${product.precio.toFixed(2)}</Text>
          {product.stock > 0 ? (
            <Text style={styles.stock}>{product.stock} en stock</Text>
          ) : (
            <Text style={styles.noStock}>Agotado</Text>
          )}
        </View>

        <Text style={styles.vendidos}>
          {product.vendidos > 0 ? `${product.vendidos} vendidos` : ' '}
        </Text>

        <Button
          label={product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
          accessibilityLabel={product.stock > 0 ? `Agregar ${product.titulo} al carrito` : `${product.titulo}, agotado`}
          variant="outline"
          size="sm"
          fullWidth
          disabled={product.stock <= 0}
          onPress={handleAddToCart}
          style={styles.addButton}
        />
      </View>
      </Pressable>
      {tilt && <Animated.View pointerEvents="none" style={[styles.glare, glareStyle]} />}
    </Animated.View>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: t.surface,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 10px 30px rgba(26,16,51,0.12), 0px 2px 6px rgba(26,16,51,0.08)',
    elevation: 6,
    // Subtle border
    borderWidth: 1,
    borderColor: t.border,
  },
  compactContainer: {
    width: 180,
    marginBottom: 12,
  },
  featuredContainer: {
    borderWidth: 2,
    borderColor: t.accent,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: t.bg,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: t.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: t.inkMuted,
  },
  bestSellerBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: t.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: t.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bestSellerText: {
    color: t.onAccent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 12,
    backgroundColor: t.surface,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.serif,
    lineHeight: 20,
    // Always two lines tall, so one-line titles don't shrink the card.
    minHeight: 40,
    marginBottom: 4,
    color: t.ink,
  },
  autor: {
    fontSize: 12,
    color: t.inkMuted,
    marginBottom: 8,
  },
  priceContainer: {
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: t.accent,
  },
  stock: {
    fontSize: 11,
    color: t.success,
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  noStock: {
    fontSize: 11,
    color: t.danger,
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  vendidos: {
    fontSize: 10,
    color: t.inkMuted,
    marginBottom: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  glare: {
    position: 'absolute',
    top: '-25%',
    left: '-25%',
    width: '150%',
    height: '150%',
    borderRadius: 9999,
    // Web-only view: react-native-web passes backgroundImage through as CSS.
    ...({ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 45%)' } as ViewStyle),
  },
  addButton: {
    marginTop: 8,
  },
});
