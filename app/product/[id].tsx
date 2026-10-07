// Product Detail Screen
// Deep-linkable route: /product/:id

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../../lib/cart-context';
import { getProductoById, Product } from '../../lib/database';
import { resolveProductImageUrl } from '../../lib/product-image';
import { formatDuration, getTracksByProduct, Track } from '../../lib/tracks';
import { Button } from '../../components/button';
import { PatternBackground } from '../../components/pattern-background';
import { Skeleton, SkeletonRegion } from '../../components/skeleton';
import { useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
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
        if (p.category === 'vinyl') {
          getTracksByProduct(p.id)
            .then((t) => active && setTracks(t))
            .catch(() => undefined); // tracklist is optional; the product page still works without it
        }
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
      <SkeletonRegion style={styles.container}>
        <Skeleton aspectRatio={1} radius={16} style={styles.skeletonCover} />
        <Skeleton height={26} width="75%" />
        <Skeleton height={18} width="45%" style={styles.skeletonGap} />
        <Skeleton height={28} width={96} style={styles.skeletonGap} />
        <Skeleton height={16} style={styles.skeletonGap} />
        <Skeleton height={16} width="90%" style={styles.skeletonGap} />
        <Skeleton height={16} width="70%" style={styles.skeletonGap} />
      </SkeletonRegion>
    );
  }

  if (status === 'error' || !product) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Producto' }} />
        <Text style={styles.errorText} accessibilityRole="alert">Producto no encontrado.</Text>
      </View>
    );
  }

  const inStock = product.stock > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PatternBackground />
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

      {tracks.length > 0 && (
        <View style={styles.tracklist}>
          <Text style={styles.tracksTitle} accessibilityRole="header">Canciones</Text>
          {tracks.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <Text style={styles.trackPos}>{track.position}</Text>
              <Text style={styles.trackName} numberOfLines={2}>{track.title}</Text>
              <Text style={styles.trackMeta}>{formatDuration(track.durationS)}</Text>
              <Text style={styles.trackPrice}>${track.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      <Button
        label={inStock ? 'Agregar al carrito' : 'Agotado'}
        fullWidth
        disabled={!inStock}
        onPress={() => void addItem(product, 1)}
        style={styles.addButton}
      />
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  skeletonCover: { marginBottom: 20 },
  skeletonGap: { marginTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 20, backgroundColor: t.bg, flexGrow: 1 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: t.surface, marginBottom: 20 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', fontFamily: Fonts.serif, color: t.ink },
  author: { fontSize: 16, color: t.inkMuted, marginTop: 4 },
  price: { fontSize: 24, fontWeight: 'bold', color: t.accent, marginTop: 16 },
  stock: { fontSize: 13, color: t.success, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  noStock: { fontSize: 13, color: t.danger, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  meta: { fontSize: 13, color: t.inkMuted, marginTop: 2 },
  description: { fontSize: 15, color: t.ink, lineHeight: 22, marginTop: 16 },
  errorText: { fontSize: 16, color: t.inkMuted },
  tracklist: { marginTop: 24 },
  tracksTitle: { fontSize: 18, fontWeight: '700', fontFamily: Fonts.serif, color: t.ink, marginBottom: 8 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.inkMuted },
  trackPos: { width: 28, fontSize: 13, color: t.inkMuted },
  trackName: { flex: 1, fontSize: 15, color: t.ink },
  trackMeta: { fontSize: 13, color: t.inkMuted },
  trackPrice: { fontSize: 14, fontWeight: '600', color: t.accent, minWidth: 52, textAlign: 'right' },
  addButton: { marginTop: 24 },
});
