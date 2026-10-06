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
import { useCart } from '../lib/cart-context';
import { Product } from '../lib/database';
import { resolveProductImageUrl } from '../lib/product-image';

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
  const { addItem } = useCart();
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
      <TouchableOpacity onPress={onPress} style={styles.imageContainer}>
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

        <TouchableOpacity
          style={[
            styles.addButton,
            product.stock <= 0 && styles.disabledButton,
          ]}
          onPress={handleAddToCart}
          disabled={product.stock <= 0}
        >
          <Text style={styles.addButtonText}>
            {product.stock > 0 ? 'Agregar' : 'Agotado'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: (width - 40) / 2,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    // Enhanced shadow for better depth
    boxShadow: '0px 4px 12px rgba(0,0,0,0.15), 0px 2px 6px rgba(0,0,0,0.1)',
    elevation: 6,
    // Subtle border
    borderWidth: 1,
    borderColor: '#f0f0f0',
    // Top accent border with theme color
    borderTopWidth: 3,
    borderTopColor: '#4b0082',
  },
  compactContainer: {
    width: 180,
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#ffd700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bestSellerText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  autor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b0082',
  },
  stock: {
    fontSize: 11,
    color: '#27ae60',
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: '#f0f9f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  noStock: {
    fontSize: 11,
    color: '#e74c3c',
    marginTop: 4,
    fontWeight: '600',
    backgroundColor: '#fdf2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  vendidos: {
    fontSize: 10,
    color: '#9b59b6',
    marginBottom: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  addButton: {
    backgroundColor: '#4b0082',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4b0082',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
