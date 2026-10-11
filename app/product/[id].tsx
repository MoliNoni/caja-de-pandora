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
import { getAudiobookPreviewUrl, getRecordPreviewUrl } from '../../lib/previews';
import { getAlsoBought, getProductoById, Product, productCache } from '../../lib/database';
import { resolveProductImageUrl } from '../../lib/product-image';
import { getBookSynopsis } from '../../lib/book-info';
import { getDiscogsTracklist, type Track } from '../../lib/discogs';
import { Button } from '../../components/button';
import { SectionCarousel } from '../../components/section-carousel';
import { PatternBackground } from '../../components/pattern-background';
import { VinylPlayer } from '../../components/vinyl-player';
import { BookCover } from '../../components/book-cover';
import { ListenButton } from '../../components/listen-button';
import { useBurst } from '../../components/pixel-burst';
import { useFlyToCart } from '../../components/fly-to-cart';
import { AppHeader } from '../../components/app-header';
import { Skeleton, SkeletonRegion } from '../../components/skeleton';
import { useTheme, useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

const TRACKS_SHOWN = 5;
const FOOTER_CLEARANCE = 88; // room under the content for the floating add-to-cart pill

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const { addItem } = useCart();
  const theme = useTheme();
  const burst = useBurst();
  const fly = useFlyToCart();
  const { width, height } = useWindowDimensions();
  // The media box takes whatever height the info leaves (measured), so the book or deck grows to
  // fill the screen instead of leaving a gap above the button. First frame uses an estimate.
  const [mediaBox, setMediaBox] = useState(height * 0.45);
  const discSize = Math.min(width - 40, 340, (mediaBox - 8) / 0.9); // deck is 0.9 x its width tall
  const bookWidth = Math.min(width * 0.8, 320, (mediaBox - 18) / 1.5); // book is 1.5 x its width tall
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
  // Records list their songs (Discogs, via the proxy) in the room the deck can't use.
  const [tracks, setTracks] = useState<Track[] | undefined>(undefined); // undefined = loading
  const [allTracks, setAllTracks] = useState(false);
  const discogsId = product?.discogs_id;
  useEffect(() => {
    if (!isVinyl || !discogsId) return setTracks([]);
    let active = true;
    setTracks(undefined);
    getDiscogsTracklist(discogsId).then((list) => active && setTracks(list));
    return () => {
      active = false;
    };
  }, [isVinyl, discogsId]);

  // Below the first screen: the fold keeps its full-screen layout and the row is reached by scrolling.
  const [alsoBought, setAlsoBought] = useState<Product[]>([]);
  const [viewport, setViewport] = useState(0);
  useEffect(() => {
    let active = true;
    setAlsoBought([]);
    getAlsoBought(String(id)).then((list) => active && setAlsoBought(list));
    return () => {
      active = false;
    };
  }, [id]);

  const recordKey = `record:${id}`;
  const resolveRecord = useCallback(
    () => getRecordPreviewUrl(product?.autor, product?.titulo ?? ''),
    [product?.autor, product?.titulo]
  );

  // Books: the opening of the professional audiobook narration (iTunes sample).
  const resolveBook = useCallback(
    () => getAudiobookPreviewUrl(product?.autor, product?.titulo ?? ''),
    [product?.autor, product?.titulo]
  );

  const recordMeta = product
    ? { title: product.titulo, subtitle: product.autor, cover: imageUri, href: `/product/${product.id}` }
    : undefined;

  // Resolve the preview up front: the tap then plays inside the browser's user-gesture window.
  useEffect(() => {
    if (isVinyl) void resolveRecord();
  }, [isVinyl, resolveRecord]);

  const add = (e: GestureResponderEvent) => {
    if (!product) return;
    burst(e, isVinyl ? theme.gradients.vinyl : theme.gradients.books, 'lg');
    fly(e, imageUri);
    void addItem(product, 1);
  };

  const back = <AppHeader back fallback={isVinyl ? '/(tabs)/vinyl' : '/(tabs)/explore'} />;

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.screen}>
        {back}
        <SkeletonRegion style={styles.content}>
          <Skeleton height={mediaBox} radius={16} style={styles.skeletonCover} />
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

      <Animated.ScrollView
        entering={FadeIn.duration(220)}
        contentContainerStyle={styles.content}
        onLayout={(e) => setViewport(Math.round(e.nativeEvent.layout.height))}
      >
        <View style={[styles.fold, alsoBought.length > 0 && viewport > 0 && { minHeight: viewport - FOOTER_CLEARANCE }]}>
          {/* Flexible box: its height comes from the free space, never from the media inside it. */}
          <View style={styles.mediaBox} onLayout={(e) => setMediaBox(Math.round(e.nativeEvent.layout.height))}>
            <View style={styles.mediaFill}>
              {isVinyl ? (
                <Animated.View entering={FadeIn.duration(200)}>
                  <VinylPlayer trackId={recordKey} title={product.titulo} coverUri={imageUri} size={discSize} resolve={resolveRecord} meta={recordMeta} />
                </Animated.View>
              ) : (
                <BookCover uri={imageUri} title={product.titulo} author={product.autor} synopsis={synopsis} width={bookWidth} />
              )}
            </View>
          </View>

          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Text style={styles.kicker}>{isVinyl ? 'Vinilo' : 'Libro'}</Text>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {product.titulo}
            </Text>
            {!!product.autor && <Text style={styles.author} numberOfLines={1}>{product.autor}</Text>}
            {!isVinyl && (
              <ListenButton trackId={`book:${product.id}`} resolve={resolveBook} meta={recordMeta} label="Escuchar el comienzo" />
            )}
          </Animated.View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.precio.toFixed(2)}</Text>
            <Text style={[styles.stockText, inStock ? styles.stock : styles.noStock]}>
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

          {tracks === undefined ? (
            <View style={styles.tracks} accessibilityLabel="Cargando canciones">
              <Text style={styles.tracksTitle}>Canciones</Text>
              {Array.from({ length: TRACKS_SHOWN }, (_, i) => (
                <View key={i} style={styles.trackRow}>
                  <Skeleton height={12} width={`${88 - i * 9}%`} style={styles.trackSkeleton} />
                </View>
              ))}
            </View>
          ) : tracks.length > 0 ? (
            <Animated.View entering={FadeIn.duration(260)} style={styles.tracks}>
              <Text style={styles.tracksTitle}>Canciones</Text>
              {(allTracks ? tracks : tracks.slice(0, TRACKS_SHOWN)).map((t, i) => (
                <View key={`${t.position}-${i}`} style={styles.trackRow}>
                  <Text style={styles.trackPos}>{t.position || i + 1}</Text>
                  <Text style={styles.trackTitle} numberOfLines={1}>{t.title}</Text>
                  {!!t.duration && <Text style={styles.trackTime}>{t.duration}</Text>}
                </View>
              ))}
              {tracks.length > TRACKS_SHOWN ? (
                <Pressable onPress={() => setAllTracks((v) => !v)} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.more}>{allTracks ? 'Ver menos' : `Ver las ${tracks.length} canciones`}</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          ) : null}
        </View>

        {alsoBought.length > 0 && (
          <View style={styles.alsoBought}>
            <SectionCarousel kicker="También compraron" title="Quienes lo llevaron" products={alsoBought} />
          </View>
        )}
      </Animated.ScrollView>

      {/* Always in reach: a floating pill over the content, no bar behind it. */}
      <View style={styles.footer}>
        <Button label={inStock ? 'Agregar al carrito' : 'Agotado'} fullWidth disabled={!inStock} onPress={add} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  // Bottom padding clears the floating add-to-cart pill.
  content: { paddingHorizontal: 20, paddingBottom: FOOTER_CLEARANCE, flexGrow: 1 },
  fold: { flexGrow: 1 },
  // Starts past the pill so nothing peeks half-covered; the carousel header lines up with the page text.
  alsoBought: { marginHorizontal: -8, marginTop: FOOTER_CLEARANCE + 12 },
  skeletonCover: { marginBottom: 16 },
  skeletonGap: { marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  // minHeight keeps the media readable when a long text makes the page scroll.
  mediaBox: { flex: 1, minHeight: 260, marginBottom: 8 },
  mediaFill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  tracks: { marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  tracksTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.accent, marginBottom: 10 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  trackSkeleton: { marginVertical: 3, marginLeft: 36 },
  trackPos: { width: 26, fontSize: 12, color: t.inkMuted, fontVariant: ['tabular-nums'] },
  trackTitle: { flex: 1, fontSize: 14, color: t.ink },
  trackTime: { fontSize: 12, color: t.inkMuted, fontVariant: ['tabular-nums'] },
  kicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.accent, marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: '500', letterSpacing: -0.4, fontFamily: Fonts.serif, color: t.ink },
  author: { fontSize: 15, color: t.inkMuted, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16 },
  price: { fontSize: 26, fontWeight: '500', fontFamily: Fonts.serif, color: t.accent },
  // Quiet stock line instead of a pill: the price is the one loud thing in the row.
  stockText: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase' },
  stock: { color: t.success, borderColor: t.success },
  noStock: { color: t.danger, borderColor: t.danger },
  meta: { fontSize: 13, color: t.inkMuted, marginTop: 8 },
  description: { fontSize: 14, color: t.ink, lineHeight: 21, marginTop: 14 },
  more: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.accent, marginTop: 8 },
  errorText: { fontSize: 16, color: t.inkMuted },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    borderRadius: 2,
    boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
  },
});
