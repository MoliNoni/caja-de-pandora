import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Fonts, Spacing, type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useThemedStyles } from '../hooks/use-theme';
import { productCache, type Product } from '../lib/database';
import { getRecordPreviewUrl } from '../lib/previews';
import { VinylPlayer } from './vinyl-player';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Same pick for everyone during a calendar week; rotates on its own, no admin step needed. */
const pickOfTheWeek = (products: Product[]) => {
  const pool = [...new Map(products.filter((p) => p.imageUrl).map((p) => [p.id, p])).values()];
  pool.sort((a, b) => a.id.localeCompare(b.id));
  return pool.length ? pool[Math.floor(Date.now() / WEEK_MS) % pool.length] : undefined;
};

type Props = { books: Product[]; vinyls: Product[] };

/** Home feature: one book to read and one record to play, side by side. */
export function WeeklyPick({ books, vinyls }: Props) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const book = useMemo(() => pickOfTheWeek(books), [books]);
  const record = useMemo(() => pickOfTheWeek(vinyls), [vinyls]);
  const resolveRecord = useCallback(() => getRecordPreviewUrl(record?.autor, record?.titulo ?? ''), [record?.autor, record?.titulo]);

  if (!book || !record) return null;

  const stacked = width < 640;
  const discSize = Math.min(stacked ? width - 96 : 220, 240);
  const open = (p: Product) => {
    productCache.set(p.id, p);
    router.push({ pathname: '/product/[id]', params: { id: p.id } });
  };

  const link = (p: Product, label: string) => (
    <Pressable
      onPress={() => open(p)}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${p.titulo}`}
      style={(state) => [styles.link, isFocused(state) && styles.focusRing]}
    >
      <Text style={styles.linkText}>{label} →</Text>
    </Pressable>
  );

  return (
    <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.card}>
      <Text style={styles.eyebrow}>La recomendación de la semana</Text>
      <Text style={styles.heading} accessibilityRole="header">
        Un libro para leer, un disco para escuchar
      </Text>

      <View style={[styles.row, stacked && styles.stack]}>
        <View style={styles.panel}>
          <Pressable onPress={() => open(book)} accessibilityRole="link" accessibilityLabel={`Ver libro: ${book.titulo}`} style={(state) => [styles.coverWrap, isFocused(state) && styles.focusRing]}>
            <Image source={{ uri: book.imageUrl }} style={styles.cover} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
          </Pressable>
          <Text style={styles.kind}>Para leer</Text>
          <Text style={styles.title} numberOfLines={2}>{book.titulo}</Text>
          <Text style={styles.author}>{book.autor}</Text>
          {book.descripcion ? <Text style={styles.blurb} numberOfLines={3}>{book.descripcion}</Text> : null}
          {link(book, 'Ver libro')}
        </View>

        <View style={styles.panel}>
          <VinylPlayer
            trackId={`record:${record.id}`}
            title={record.titulo}
            coverUri={record.imageUrl}
            size={discSize}
            resolve={resolveRecord}
            meta={{ title: record.titulo, subtitle: record.autor, cover: record.imageUrl, href: `/product/${record.id}` }}
          />
          <Text style={styles.kind}>Para escuchar</Text>
          <Text style={styles.title} numberOfLines={2}>{record.titulo}</Text>
          <Text style={styles.author}>{record.autor}</Text>
          {link(record, 'Ver disco')}
        </View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 8,
      marginBottom: 28,
      padding: Spacing.xl,
      borderRadius: 24,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      boxShadow: '0 18px 44px rgba(26,16,51,0.12)',
    },
    eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: t.accent },
    heading: { fontSize: 26, lineHeight: 32, fontWeight: '800', fontFamily: Fonts.serif, color: t.ink, marginTop: 6, marginBottom: Spacing.xl },
    row: { flexDirection: 'row', gap: Spacing.xxl, alignItems: 'flex-start' },
    stack: { flexDirection: 'column', alignItems: 'center' },
    panel: { flex: 1, minWidth: 0, alignItems: 'center', width: '100%' },
    coverWrap: { borderRadius: 10 },
    cover: { width: 150, height: 225, borderRadius: 10, boxShadow: '0 14px 30px rgba(0,0,0,0.25)' },
    kind: { marginTop: Spacing.lg, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: t.inkMuted },
    title: { marginTop: 4, fontSize: 19, lineHeight: 24, fontWeight: '800', fontFamily: Fonts.serif, color: t.ink, textAlign: 'center' },
    author: { marginTop: 2, fontSize: 14, color: t.inkMuted, textAlign: 'center' },
    blurb: { marginTop: Spacing.sm, fontSize: 14, lineHeight: 20, color: t.inkMuted, textAlign: 'center', maxWidth: 320 },
    link: { marginTop: Spacing.md, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
    linkText: { fontSize: 14, fontWeight: '800', color: t.accent },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.accent, outlineOffset: 2 },
  });
