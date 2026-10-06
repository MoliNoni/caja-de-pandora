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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from './button';
import { useCart } from '../lib/cart-context';
import { Product } from '../lib/database';
import { resolveProductImageUrl } from '../lib/product-image';
import { useThemedStyles } from '../hooks/use-theme';
import type { Theme } from '../constants/theme';

const { width } = Dimensions.get('window');

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  isBestSeller?: boolean;
  compact?: boolean;
}

// Product card component
export const ProductCard = ({
  product,
  onPress,
  isBestSeller = false,
  compact = false,
}: ProductCardProps) => {
  const styles = useThemedStyles(makeStyles);
  const { addItem } = useCart();
  const router = useRouter();
  const openDetail = onPress ?? (() => router.push({ pathname: '/product/[id]', params: { id: product.id } }));
  const [imageUri, setImageUri] = useState<string | null>(product.imageUrl);

  // Load product cover image
  useEffect(() => {
    const fetchImage = async () => {
      const coverUrl = await resolveProductImageUrl(product);
      if (coverUrl) {
        setImageUri(coverUrl);
      }
    };
    fetchImage();
  }, [product]);

  // Add product to cart
  const handleAddToCart = () => {
    void addItem(product, 1);
  };

  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
      ]}
    >
      <TouchableOpacity
        onPress={openDetail}
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
            <Text style={styles.placeholderText}>Sin imagen</Text>
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
          label={product.stock > 0 ? 'Agregar' : 'Agotado'}
          variant="outline"
          fullWidth
          disabled={product.stock <= 0}
          onPress={handleAddToCart}
          style={styles.addButton}
        />
      </View>
    </View>
  );
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    width: (width - 40) / 2,
    marginBottom: 16,
    backgroundColor: t.surface,
    borderRadius: 16,
    overflow: 'hidden',
    // Enhanced shadow for better depth
    boxShadow: '0px 4px 12px rgba(0,0,0,0.15), 0px 2px 6px rgba(0,0,0,0.1)',
    elevation: 6,
    // Subtle border
    borderWidth: 1,
    borderColor: t.border,
    // Top accent border with theme color
    borderTopWidth: 3,
    borderTopColor: t.accent,
  },
  compactContainer: {
    width: 180,
    marginBottom: 12,
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
    fontSize: 48,
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
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: 'bold',
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
