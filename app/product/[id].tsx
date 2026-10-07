// Product Detail Screen
// Deep-linkable route: /product/:id

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
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
import { getBookSynopsis } from '../../lib/book-info';
import { Button } from '../../components/button';
import { PatternBackground } from '../../components/pattern-background';
import { VinylPlayer } from '../../components/vinyl-player';
import { BookCover } from '../../components/book-cover';
import { useBurst } from '../../components/pixel-burst';
import { useFlyToCart } from '../../components/fly-to-cart';
import { AppHeader } from '../../components/app-header';
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
  const { width, height } = useWindowDimensions();
  // Media gets ~40 % of the screen height so the whole page fits a phone without scrolling.
  const mediaH = height * 0.4;
  const discSize = Math.min(width - 40, 340, mediaH / 0.9); // deck is 0.9 x its width tall
  const bookWidth = Math.min(width * 0.72, 290, mediaH / 1.5); // book is 1.5 x its width tall
  const [expanded, setExpanded] = useState(false);
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

  // Spanish synopsis for the inside page (see lib/book-info.ts for the sources).
  const [synopsis, setSynopsis] = useState<string | null | undefined>(undefined);
  const isBook = product?.category === 'book';
  const { isbn, titulo, autor, descripcion } = product ?? {};
  useEffect(() => {
    if (!isBook || !titulo) return;
    let active = true;
    setSynopsis(undefined);
    getBookSynopsis({ isbn, titulo, autor, descripcion }).then((text) => {
      if (active) setSynopsis(text);
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

  const back = <AppHeader back fallback={isVinyl ? '/(tabs)/vinyl' : '/(tabs)/explore'} />;

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.screen}>
        {back}
        <SkeletonRegion style={styles.content}>
          <Skeleton height={mediaH} radius={16} style={styles.skeletonCover} />
          <Skeleton height={24} width="75%" />
          <Skeleton height={16} width="45%" style={styles.skeletonGap} />
          <Skeleton height={24} width={96} style={styles.skeletonGap} />
          <Skeleton height={14} style={styles.skeletonGap} />
          <Skeleton height={14} width="80%" style={styles.skeletonGap} />
        </SkeletonRegion>
      </SafeAreaView>
    );
  }

  if (status === 'error' || !product) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ title: 'Producto' }} />
        {back}
        <View style={styles.center}>
          <Text style={styles.errorText} accessibilityRole="alert">Producto no encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const inStock = product.stock > 0;
  const meta = [product.editorial, product.anio_publicacion, product.genero].filter(Boolean).join(' · ');
  // A book already shows this text inside its cover when it is the synopsis.
  const description =
    product.descripcion && product.descripcion.trim() !== synopsis?.trim() ? product.descripcion : null;
  const longDescription = !!description && description.length > 160;

  return (
    <SafeAreaView style={styles.screen}>
      <PatternBackground />
      {/* Title for the browser tab; the visible bar is AppHeader (keeps "back" after a reload). */}
      <Stack.Screen options={{ title: product.titulo }} />
      {back}

      <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={styles.content}>
        {isVinyl ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.media}>
            <VinylPlayer trackId={recordKey} title={product.titulo} coverUri={imageUri} size={discSize} resolve={resolveRecord} meta={recordMeta} />
          </Animated.View>
        ) : (
          <BookCover uri={imageUri} title={product.titulo} author={product.autor} synopsis={synopsis} width={bookWidth} />
        )}

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
            {product.titulo}
          </Text>
          {!!product.autor && <Text style={styles.author} numberOfLines={1}>{product.autor}</Text>}
        </Animated.View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>${product.precio.toFixed(2)}</Text>
          <Text style={[styles.stockChip, inStock ? styles.stock : styles.noStock]}>
            {inStock ? `${product.stock} en stock` : 'Agotado'}
          </Text>
        </View>

        {!!meta && <Text style={styles.meta} numberOfLines={1}>{meta}</Text>}

        {description ? (
          <>
            <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>{description}</Text>
            {longDescription ? (
              <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.more}>{expanded ? 'Leer menos' : 'Leer más'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </Animated.ScrollView>

      {/* Always in reach: the main action never scrolls away. */}
      <View style={styles.footer}>
        <Button label={inStock ? 'Agregar al carrito' : 'Agotado'} fullWidth disabled={!inStock} onPress={add} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 },
  skeletonCover: { marginBottom: 16 },
  skeletonGap: { marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  media: { alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, fontFamily: Fonts.serif, color: t.ink },
  author: { fontSize: 15, color: t.inkMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  price: { fontSize: 24, fontWeight: '800', color: t.accent },
  stockChip: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  stock: { color: t.success, borderColor: t.success },
  noStock: { color: t.danger, borderColor: t.danger },
  meta: { fontSize: 13, color: t.inkMuted, marginTop: 6 },
  description: { fontSize: 14, color: t.ink, lineHeight: 20, marginTop: 10 },
  more: { fontSize: 13, fontWeight: '700', color: t.accent, marginTop: 4 },
  errorText: { fontSize: 16, color: t.inkMuted },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bg,
  },
});
