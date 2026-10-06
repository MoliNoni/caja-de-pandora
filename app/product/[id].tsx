// Product Detail Screen
// Deep-linkable route: /product/:id

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../../lib/cart-context';
import { getProductoById, Product } from '../../lib/database';
import { resolveProductImageUrl } from '../../lib/product-image';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getProductoById(String(id))
      .then(async (p) => {
        if (!active) return;
        setProduct(p);
        setImageUri(p.imageUrl || null);
        setStatus('ready');
        const cover = await resolveProductImageUrl(p);
        if (active && cover) setImageUri(cover);
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4b0082" />
      </View>
    );
  }

  if (status === 'error' || !product) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Producto' }} />
        <Text style={styles.errorText}>Producto no encontrado.</Text>
      </View>
    );
  }

  const inStock = product.stock > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: product.titulo }} />

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`Portada de ${product.titulo}`}
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.meta}>Sin imagen</Text>
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">
        {product.titulo}
      </Text>
      {!!product.autor && <Text style={styles.author}>{product.autor}</Text>}

      <Text style={styles.price}>${product.precio.toFixed(2)}</Text>
      <Text style={inStock ? styles.stock : styles.noStock}>
        {inStock ? `${product.stock} en stock` : 'Agotado'}
      </Text>

      {[product.editorial, product.anio_publicacion, product.genero]
        .filter(Boolean)
        .map((value) => (
          <Text key={String(value)} style={styles.meta}>
            {value}
          </Text>
        ))}

      {!!product.descripcion && <Text style={styles.description}>{product.descripcion}</Text>}

      <TouchableOpacity
        style={[styles.addButton, !inStock && styles.disabledButton]}
        onPress={() => void addItem(product, 1)}
        disabled={!inStock}
        accessibilityRole="button"
        accessibilityState={{ disabled: !inStock }}
      >
        <Text style={styles.addButtonText}>{inStock ? 'Agregar al carrito' : 'Agotado'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#fafafa', marginBottom: 20 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#333' },
  author: { fontSize: 16, color: '#666', marginTop: 4 },
  price: { fontSize: 24, fontWeight: 'bold', color: '#4b0082', marginTop: 16 },
  stock: { fontSize: 13, color: '#27ae60', fontWeight: '600', marginTop: 4, marginBottom: 12 },
  noStock: { fontSize: 13, color: '#e74c3c', fontWeight: '600', marginTop: 4, marginBottom: 12 },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  description: { fontSize: 15, color: '#333', lineHeight: 22, marginTop: 16 },
  errorText: { fontSize: 16, color: '#666' },
  addButton: {
    backgroundColor: '#4b0082',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: { backgroundColor: '#bdc3c7' },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
});
