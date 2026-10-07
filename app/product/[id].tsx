// Product Detail Screen
// Deep-linkable route: /product/:id

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../../lib/cart-context';
import { getRecordPreviewUrl } from '../../lib/previews';
import { usePlayer } from '../../lib/player-context';
import { getProductoById, Product, productCache } from '../../lib/database';
import { resolveProductImageUrl } from '../../lib/product-image';
import { getOpenLibrarySynopsis } from '../../lib/openlibrary';
import { Button } from '../../components/button';
import { PatternBackground } from '../../components/pattern-background';
import { VinylPlayer } from '../../components/vinyl-player';
import { BookCover } from '../../components/book-cover';
import { useBurst } from '../../components/pixel-burst';
import { useFlyToCart } from '../../components/fly-to-cart';
import { CartButton } from '../../components/app-header';
import { Skeleton, SkeletonRegion } from '../../components/skeleton';
import { useTheme, useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const { addItem } = useCart();
  const player = usePlayer();
  const theme = useTheme();
  const burst = useBurst();
  const fly = useFlyToCart();
  const { width } = useWindowDimensions();
  const discSize = Math.min(width - 40, 340);
  // A tapped card primes the cache: render it at once (no blank frame, no skeleton), refresh behind.
  const cached = productCache.get(String(id)) ?? null;
  const [product, setProduct] = useState<Product | null>(cached);
  const [imageUri, setImageUri] = useState<string | null>(cached?.imageUrl || null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(cached ? 'ready' : 'loading');

  useEffect(() => {
    let active = true;
    if (!productCache.has(String(id))) setStatus('loading');
    getProductoById(String(id))
      .then(async (p) => {
        if (!active) return;
        setProduct(p);
        setImageUri((current) => current || p.imageUrl || null);
        setStatus('ready');
        const cover = await resolveProductImageUrl(p);
        if (active && cover) setImageUri(cover);
      })
      .catch(() => active && !productCache.has(String(id)) && setStatus('error'));
    return () => {
      active = false;
    };
  }, [id]);

  const isVinyl = product?.category === 'vinyl';

  // Book synopsis for the inside page: Open Library first, the catalog description as fallback.
  const [synopsis, setSynopsis] = useState<string | null | undefined>(undefined);
  const isBook = product?.category === 'book';
  const { isbn, titulo, autor, descripcion } = product ?? {};
  useEffect(() => {
    if (!isBook || !titulo) return;
    let active = true;
    setSynopsis(undefined);
    getOpenLibrarySynopsis({ isbn, titulo, autor }).then((text) => {
      if (active) setSynopsis(text ?? (descripcion || null));
    });
    return () => {
      active = false;
    };
  }, [isBook, isbn, titulo, autor, descripcion]);
  const recordKey = `record:${id}`;
  const resolveRecord = useCallback(
    () => getRecordPreviewUrl(product?.autor, product?.titulo ?? ''),
    [product?.autor, product?.titulo]
  );

  const recordMeta = product
    ? { title: product.titulo, subtitle: product.autor, cover: imageUri, href: `/product/${product.id}` }
    : undefined;

  // Resolve the preview up front: the tap then plays inside the browser's user-gesture window.
  useEffect(() => {
    if (isVinyl) void resolveRecord();
  }, [isVinyl, resolveRecord]);

  // A record starts spinning (and playing) the moment it goes into the cart.
  const add = (e: GestureResponderEvent) => {
    if (!product) return;
    burst(e, isVinyl ? theme.gradients.vinyl : theme.gradients.books, 'lg');
    fly(e, imageUri);
    void addItem(product, 1);
    if (isVinyl && !(player.trackId === recordKey && player.isPlaying)) void player.play(recordKey, resolveRecord, recordMeta);
  };

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
    <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={styles.container}>
      <PatternBackground />
      <Stack.Screen options={{ title: product.titulo, headerRight: () => <CartButton /> }} />

      {isVinyl ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <VinylPlayer trackId={recordKey} title={product.titulo} coverUri={imageUri} size={discSize} resolve={resolveRecord} meta={recordMeta} />
        </Animated.View>
      ) : (
        <BookCover uri={imageUri} title={product.titulo} author={product.autor} synopsis={synopsis} width={Math.min(width * 0.72, 290)} />
      )}

      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <Text style={styles.title} accessibilityRole="header">
          {product.titulo}
        </Text>
        {!!product.autor && <Text style={styles.author}>{product.autor}</Text>}
      </Animated.View>

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

      {/* A book already shows this text inside its cover when it is the synopsis. */}
      {!!product.descripcion && product.descripcion.trim() !== synopsis?.trim() && (
        <Text style={styles.description}>{product.descripcion}</Text>
      )}


      <Button
        label={inStock ? 'Agregar al carrito' : 'Agotado'}
        fullWidth
        disabled={!inStock}
        onPress={add}
        style={styles.addButton}
      />
    </Animated.ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  skeletonCover: { marginBottom: 20 },
  skeletonGap: { marginTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 20, backgroundColor: t.bg, flexGrow: 1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, fontFamily: Fonts.serif, color: t.ink },
  author: { fontSize: 16, color: t.inkMuted, marginTop: 4 },
  price: { fontSize: 28, fontWeight: 'bold', color: t.accent, marginTop: 16 },
  stock: { fontSize: 13, color: t.success, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  noStock: { fontSize: 13, color: t.danger, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  meta: { fontSize: 13, color: t.inkMuted, marginTop: 2 },
  description: { fontSize: 15, color: t.ink, lineHeight: 22, marginTop: 16 },
  errorText: { fontSize: 16, color: t.inkMuted },
  addButton: { marginTop: 24 },
});
