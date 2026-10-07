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
  Dimensions,
  Pressable,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Button } from './button';
import { useCart } from '../lib/cart-context';
import { useBurst } from './pixel-burst';
import { Product, productCache } from '../lib/database';
import { peekProductImageUrl, resolveProductImageUrl } from '../lib/product-image';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { Fonts, type Theme } from '../constants/theme';

const { width } = Dimensions.get('window');

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  isBestSeller?: boolean;
  compact?: boolean;
  featured?: boolean;
  /** Position in its list: staggers the entrance. */
  index?: number;
}

// Product card component
export const ProductCard = ({
  product,
  onPress,
  isBestSeller = false,
  compact = false,
  featured = false,
  index = 0,
}: ProductCardProps) => {
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const lift = useSharedValue(0);
  const liftStyle = useAnimatedStyle((): ViewStyle => ({
    transform: [{ translateY: -6 * lift.value }, { rotate: `${-0.6 * lift.value}deg` }, { scale: 1 + 0.02 * lift.value }],
  }));
  const hover = (on: boolean) => {
    if (!reducedMotion) lift.value = withSpring(on ? 1 : 0, { damping: 14, stiffness: 220 });
  };
  const { addItem } = useCart();
  const theme = useTheme();
  const burst = useBurst();
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
    void addItem(product, 1);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 70).springify().damping(14)}
      style={[
        styles.container,
        compact && styles.compactContainer,
        featured && styles.featuredContainer,
        liftStyle,
      ]}
    >
      {/* Hover-only wrapper (web): not focusable, no action of its own. */}
      <Pressable focusable={false} accessible={false} onHoverIn={() => hover(true)} onHoverOut={() => hover(false)}>
      <TouchableOpacity
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

        {product.autor && (
          <Text style={styles.autor} numberOfLines={1}>
            {product.autor}
          </Text>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.price}>${product.precio.toFixed(2)}</Text>
          {product.stock > 0 ? (
            <Text style={styles.stock}>{product.stock} en stock</Text>
          ) : (
            <Text style={styles.noStock}>Agotado</Text>
          )}
        </View>

        {product.vendidos > 0 && (
          <Text style={styles.vendidos}>{product.vendidos} vendidos</Text>
        )}

        <Button
          label={product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}
          accessibilityLabel={product.stock > 0 ? `Agregar ${product.titulo} al carrito` : `${product.titulo}, agotado`}
          variant="outline"
          fullWidth
          disabled={product.stock <= 0}
          onPress={handleAddToCart}
          style={styles.addButton}
        />
      </View>
      </Pressable>
    </Animated.View>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    width: (width - 40) / 2,
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
    padding: 16,
    backgroundColor: t.surface,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.serif,
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
  addButton: {
    marginTop: 8,
  },
});
