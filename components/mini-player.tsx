import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Theme } from '../constants/theme';
import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { usePlayer } from '../lib/player-context';

// Peak height (px) and half-period (ms) per equalizer bar: unequal periods so bars never sync up.
const BARS = [
  [14, 260],
  [18, 340],
  [11, 220],
  [16, 300],
] as const;

function Bar({ peak, ms, playing, color }: { peak: number; ms: number; playing: boolean; color: string }) {
  const reducedMotion = useReducedMotion();
  const h = useSharedValue(4);
  useEffect(() => {
    if (playing && !reducedMotion) {
      const ease = Easing.inOut(Easing.quad);
      h.value = withRepeat(
        withSequence(withTiming(peak, { duration: ms, easing: ease }), withTiming(4, { duration: ms, easing: ease })),
        -1
      );
    } else {
      cancelAnimation(h);
      h.value = withTiming(playing ? peak * 0.6 : 4, { duration: 200 });
    }
    return () => cancelAnimation(h);
  }, [playing, reducedMotion, peak, ms, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: 3, borderRadius: 2, backgroundColor: color }, style]} />;
}

/** Floating "now playing" pill on every screen while a preview is loaded; hidden on its own screen. */
export function MiniPlayer() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pathname = usePathname();
  const { nowPlaying, isPlaying, loading, trackId, toggle } = usePlayer();

  if (!nowPlaying || !trackId || pathname === nowPlaying.href) return null;
  const playing = isPlaying || loading;

  return (
    <Animated.View entering={SlideInDown.springify().damping(16)} exiting={SlideOutDown.duration(200)} style={styles.dock}>
      <Pressable
        onPress={() => router.push(nowPlaying.href as any)}
        accessibilityRole="link"
        accessibilityLabel={`Reproduciendo ${nowPlaying.title}. Abrir`}
        style={(state) => [styles.pill, isFocused(state) && styles.focusRing]}
      >
        {nowPlaying.cover ? (
          <Image source={{ uri: nowPlaying.cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, { backgroundColor: theme.vivid[0] }]} />
        )}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>{nowPlaying.title}</Text>
          {!!nowPlaying.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{nowPlaying.subtitle}</Text>}
        </View>
        <View style={styles.eq} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {BARS.map(([peak, ms], i) => (
            <Bar key={i} peak={peak} ms={ms} playing={playing} color={theme.vivid[i % theme.vivid.length]} />
          ))}
        </View>
        <Pressable
          onPress={() => void toggle(trackId)}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
          hitSlop={8}
          style={(state) => [styles.button, isFocused(state) && styles.focusRing]}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={theme.onAccent} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    dock: { position: 'absolute', left: 12, right: 12, bottom: 76, alignItems: 'center' },
    pill: {
      width: '100%',
      maxWidth: 520,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 8,
      paddingRight: 10,
      borderRadius: 999,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      boxShadow: '0px 16px 40px rgba(14,10,31,0.35)',
    },
    cover: { width: 40, height: 40, borderRadius: 20 },
    text: { flex: 1, minWidth: 0 },
    title: { fontSize: 14, fontWeight: '700', color: t.ink },
    subtitle: { fontSize: 12, color: t.inkMuted },
    eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 },
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.accent, outlineOffset: 2 },
  });
