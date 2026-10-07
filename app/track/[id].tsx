// Track Detail Screen
// Deep-linkable route: /track/:id

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { showAlert } from '../../lib/dialog';
import { getProductoById, Product } from '../../lib/database';
import { resolveProductImageUrl } from '../../lib/product-image';
import { formatDuration, getTrackById, isTrackOwned, newIdempotencyKey, purchaseTrack, Track } from '../../lib/tracks';
import { Button } from '../../components/button';
import { PatternBackground } from '../../components/pattern-background';
import { VinylPlayer } from '../../components/vinyl-player';
import { Skeleton, SkeletonDisk, SkeletonRegion } from '../../components/skeleton';
import { useThemedStyles } from '../../hooks/use-theme';
import { Fonts, type Theme } from '../../constants/theme';

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const discSize = Math.min(width - 40, 320);
  const { user } = useAuth();
  const [track, setTrack] = useState<Track | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [owned, setOwned] = useState(false);
  const [buying, setBuying] = useState(false);
  // One key per screen visit: a retry of the same attempt can never double-charge.
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getTrackById(String(id))
      .then(async (t) => {
        if (!t) throw new Error('not found');
        const p = await getProductoById(t.productId);
        if (!active) return;
        setTrack(t);
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

  useEffect(() => {
    let active = true;
    if (!user) setOwned(false);
    else isTrackOwned(String(id)).then((o) => active && setOwned(o));
    return () => {
      active = false;
    };
  }, [id, user]);

  const buy = async () => {
    if (!track) return;
    setBuying(true);
    const result = await purchaseTrack(track.id, idempotencyKey.current);
    setBuying(false);
    if (result === 'purchased') {
      setOwned(true);
      showAlert('Compra realizada', `Compraste "${track.title}".`);
    } else if (result === 'owned') {
      setOwned(true);
      showAlert('Ya tienes esta canción');
    } else if (result === 'unauthorized') {
      showAlert('Inicia sesión', 'Necesitas una cuenta para comprar canciones.');
      router.push('/signin');
    } else {
      showAlert('No se pudo completar la compra', 'Intenta de nuevo más tarde.');
    }
  };

  if (status === 'loading') {
    return (
      <SkeletonRegion style={styles.container}>
        <SkeletonDisk size={discSize} style={styles.skeletonCover} />
        <Skeleton height={26} width="75%" />
        <Skeleton height={18} width="45%" style={styles.skeletonGap} />
        <Skeleton height={28} width={96} style={styles.skeletonGap} />
      </SkeletonRegion>
    );
  }

  if (status === 'error' || !track || !product) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Canción' }} />
        <Text style={styles.errorText} accessibilityRole="alert">Canción no encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PatternBackground variant="contours" />
      <Stack.Screen options={{ title: track.title }} />

      <VinylPlayer
        trackId={track.id}
        title={track.title}
        coverUri={imageUri}
        size={discSize}
        meta={{ title: track.title, subtitle: product.autor, cover: imageUri, href: `/track/${track.id}` }}
      />

      <Text style={styles.title} accessibilityRole="header">{track.title}</Text>
      <Text style={styles.author}>{[product.autor, product.titulo].filter(Boolean).join(' · ')}</Text>
      {!!track.durationS && <Text style={styles.meta}>{formatDuration(track.durationS)}</Text>}
      <Text style={styles.price}>${track.price.toFixed(2)}</Text>

      <Button
        label={owned ? 'Ya la tienes' : 'Comprar canción'}
        fullWidth
        disabled={owned}
        loading={buying}
        onPress={() => void buy()}
        style={styles.buyButton}
      />
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  skeletonCover: { marginBottom: 20, alignSelf: 'center' },
  skeletonGap: { marginTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 20, alignItems: 'stretch', backgroundColor: t.bg, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '700', fontFamily: Fonts.serif, color: t.ink },
  author: { fontSize: 16, color: t.inkMuted, marginTop: 4 },
  meta: { fontSize: 13, color: t.inkMuted, marginTop: 2 },
  price: { fontSize: 24, fontWeight: 'bold', color: t.accent, marginTop: 16 },
  errorText: { fontSize: 16, color: t.inkMuted },
  buyButton: { marginTop: 24 },
});
