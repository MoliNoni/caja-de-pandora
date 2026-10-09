import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Fonts, type Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { useCart } from '../lib/cart-context';
import { getProductoById, productCache, type Product } from '../lib/database';
import { showAlert } from '../lib/dialog';
import { usePlayer } from '../lib/player-context';
import { DancingText } from './dancing-text';
import { getRecordPreviewUrl } from '../lib/previews';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SLEEVE = 168;
const DISC = 156;
const BOOK_W = 112;
const DISC_OUT = 74; // how far the record slides out of its sleeve
const TURN_MS = 1800; // 33⅓ rpm
// Foil-stamp gold: deep, bright, deep. The glint runs to near-white across the letters.
const GOLD = ['#B8893A', '#F3D98B', '#C99A45'];
const GOLD_GLINT = '#FFF4D6';
const money = (n: number) => `$${n.toFixed(2)}`;

/** Fallback while `weekly_pick` (migration 005) is not applied: same idea, but only the server pair carries the discount. */
const pickOfTheWeek = (products: Product[]) => {
  const pool = [...new Map(products.filter((p) => p.imageUrl).map((p) => [p.id, p])).values()];
  pool.sort((a, b) => a.id.localeCompare(b.id));
  return pool.length ? pool[Math.floor(Date.now() / WEEK_MS) % pool.length] : undefined;
};

/** A record with the album cover as its label. Spins while its preview plays, then coasts to a stop. */
function Record({ cover, spinning }: { cover?: string | null; spinning: boolean }) {
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    if (spinning) {
      turn.value = withRepeat(withTiming(turn.value + 360, { duration: TURN_MS, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(turn);
      turn.value = withTiming(turn.value + 50, { duration: 700, easing: Easing.out(Easing.cubic) });
    }
  }, [spinning, reducedMotion, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const r = DISC / 2;
  const label = DISC * 0.36;

  return (
    <Animated.View style={[{ width: DISC, height: DISC }, spin]}>
      <Svg width={DISC} height={DISC} style={StyleSheet.absoluteFill}>
        <Circle cx={r} cy={r} r={r} fill="#0B0B0D" />
        {Array.from({ length: 9 }, (_, i) => (
          <Circle key={i} cx={r} cy={r} r={r * (0.46 + i * 0.058)} fill="none" stroke="#fff" strokeOpacity={i % 2 ? 0.05 : 0.09} strokeWidth={0.8} />
        ))}
      </Svg>
      <Image accessibilityLabel="" source={cover ? { uri: cover } : undefined} style={[styles.label, { width: label, height: label, borderRadius: label / 2, left: r - label / 2, top: r - label / 2 }]} contentFit="cover" />
      <View style={[styles.spindle, { left: r - 3, top: r - 3 }]} />
    </Animated.View>
  );
}

type Props = { books: Product[]; vinyls: Product[] };

/** Home feature: this week's book and record staged as one object, tied by a single sentence. */
export function WeeklyPick({ books, vinyls }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const player = usePlayer();
  const reducedMotion = useReducedMotion();
  const wide = useWindowDimensions().width >= 720;
  // The server decides the pair (and charges the bundle); a local pick without the offer until it answers.
  const { weeklyPick } = useCart();
  const [serverPair, setServerPair] = useState<[Product, Product] | null>(null);
  useEffect(() => {
    if (!weeklyPick) return;
    const find = (id: string, list: Product[]) => list.find((p) => p.id === id) ?? getProductoById(id);
    Promise.all([find(weeklyPick.bookId, books), find(weeklyPick.vinylId, vinyls)])
      .then(([b, v]) => setServerPair([b, v]))
      .catch(() => setServerPair(null));
  }, [weeklyPick, books, vinyls]);
  const localBook = useMemo(() => pickOfTheWeek(books), [books]);
  const localRecord = useMemo(() => pickOfTheWeek(vinyls), [vinyls]);
  const [book, record] = serverPair ?? [localBook, localRecord];
  const off = serverPair && weeklyPick ? weeklyPick.discount : 0;
  const pairPrice = (book?.precio ?? 0) + (record?.precio ?? 0);
  const bundlePrice = pairPrice - Math.round(pairPrice * off * 100) / 100;

  const trackId = record ? `record:${record.id}` : '';
  const resolve = useCallback(() => getRecordPreviewUrl(record?.autor, record?.titulo ?? ''), [record?.autor, record?.titulo]);
  // Resolve the preview up front so the tap plays inside the browser's user-gesture window.
  useEffect(() => {
    if (record) void resolve();
  }, [record, resolve]);
  const active = player.trackId === trackId;
  const playing = active && (player.isPlaying || player.loading);

  // The record slides out of its sleeve once the stage is in place.
  const slide = useSharedValue(reducedMotion ? DISC_OUT : 0);
  useEffect(() => {
    if (!reducedMotion) slide.value = withDelay(420, withSpring(DISC_OUT, { damping: 16, stiffness: 120 }));
  }, [reducedMotion, slide]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value }] }));

  if (!book || !record) return null;

  const open = (p: Product) => {
    productCache.set(p.id, p);
    router.push({ pathname: '/product/[id]', params: { id: p.id } });
  };
  const listen = async () => {
    const meta = { title: record.titulo, subtitle: record.autor, cover: record.imageUrl, href: `/product/${record.id}` };
    if (!(await player.toggle(trackId, resolve, meta))) showAlert('Sin vista previa', 'No encontramos un fragmento para reproducir.');
  };

  return (
    <View style={[styles.section, wide && styles.sectionWide]}>
      <View style={styles.stage}>
        {/* Back to front: record, its sleeve, then the book leaning on the sleeve. */}
        <Animated.View style={[styles.disc, slideStyle]}>
          <Record cover={record.imageUrl} spinning={playing} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={styles.sleeveSlot}>
          <Pressable
            onPress={() => open(record)}
            accessibilityRole="link"
            accessibilityLabel={`Ver disco: ${record.titulo}`}
            style={(state) => [styles.sleeve, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
          >
            <Image accessibilityLabel="" source={{ uri: record.imageUrl }} style={styles.fill} contentFit="cover" transition={200} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify().damping(18)} style={styles.bookSlot}>
          <Pressable
            onPress={() => open(book)}
            accessibilityRole="link"
            accessibilityLabel={`Ver libro: ${book.titulo}`}
            style={(state) => [styles.book, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
          >
            <Image accessibilityLabel="" source={{ uri: book.imageUrl }} style={styles.fill} contentFit="cover" transition={200} />
            {/* Spine shading so it reads as a book, not a flat card. */}
            <View style={styles.spine} />
          </Pressable>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(320).springify().damping(18)} style={styles.copy}>
        <Text style={styles.kicker}>Esta semana</Text>
        <Text style={styles.sentence}>
          Lee <Text style={styles.em} onPress={() => open(book)}>{book.titulo}</Text> mientras suena{' '}
          <Text style={styles.em} onPress={() => open(record)}>{record.titulo}</Text>.
        </Text>
        {off > 0 && (
          <View style={styles.bundle} accessible accessibilityLabel={`Los dos juntos con ${Math.round(off * 100)}% de descuento: ${money(bundlePrice)}, antes ${money(pairPrice)}`}>
            <Text style={styles.bundleLabel}>Los dos juntos</Text>
            <DancingText text={`${Math.round(off * 100)}% OFF`} style={styles.gold} colors={GOLD} glint={GOLD_GLINT} wave={false} delay={700} />
            <Text style={styles.bundleWas}>{money(pairPrice)}</Text>
            <Text style={styles.bundleNow}>{money(bundlePrice)}</Text>
          </View>
        )}
        <Pressable
          onPress={listen}
          accessibilityRole="button"
          accessibilityLabel={playing ? `Pausar ${record.titulo}` : `Escuchar ${record.titulo}`}
          accessibilityState={{ busy: active && player.loading }}
          style={(state) => [styles.play, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={16} color={theme.accent} />
          <Text style={styles.playText}>{playing ? 'Pausar' : 'Escuchar el disco'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute' },
  spindle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#0B0B0D' },
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    section: { marginHorizontal: 8, marginBottom: 36, gap: 20 },
    sectionWide: { flexDirection: 'row', alignItems: 'center', gap: 40 },
    stage: { height: SLEEVE + 56, width: 16 + 90 + SLEEVE + DISC_OUT + 8 },
    disc: { position: 'absolute', left: 90 + (SLEEVE - DISC) / 2, top: 18 + (SLEEVE - DISC) / 2 },
    sleeveSlot: { position: 'absolute', left: 90, top: 18, transform: [{ rotate: '2deg' }] },
    sleeve: { width: SLEEVE, height: SLEEVE, borderRadius: 4, overflow: 'hidden', boxShadow: '0 16px 32px rgba(0,0,0,0.35)' },
    bookSlot: { position: 'absolute', left: 8, top: 44, transform: [{ rotate: '-7deg' }] },
    book: { width: BOOK_W, height: BOOK_W * 1.5, borderRadius: 3, overflow: 'hidden', boxShadow: '0 18px 30px rgba(0,0,0,0.45)' },
    spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: 'rgba(0,0,0,0.22)' },
    fill: { width: '100%', height: '100%' },
    pressed: { transform: [{ scale: 0.97 }] },
    copy: { flex: 1, maxWidth: 440 },
    kicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.accent, marginBottom: 12 },
    sentence: { fontSize: 24, lineHeight: 32, fontFamily: Fonts.serif, color: t.inkMuted },
    em: { color: t.ink, fontStyle: 'italic' },
    play: {
      marginTop: 16,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.accent,
    },
    playText: { fontSize: 12, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: t.accent },
    bundle: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    bundleLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: t.inkMuted },
    bundleWas: { fontSize: 14, color: t.inkMuted, textDecorationLine: 'line-through' },
    // Soft gold bloom behind the letters, as foil catching light.
    gold: { fontFamily: Fonts.serif, fontSize: 22, lineHeight: 26, fontWeight: '500', letterSpacing: 0.6, textShadowColor: 'rgba(243,217,139,0.55)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
    bundleNow: { fontFamily: Fonts.serif, fontSize: 20, fontWeight: '500', color: t.accent },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.accent, outlineOffset: 2 },
  });
