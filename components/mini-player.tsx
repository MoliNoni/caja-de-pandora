import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  SlideInDown,
  SlideOutRight,
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
import { usePlayer, usePlayerProgress } from '../lib/player-context';

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

/** Thin bar showing how much of the 30 s clip is left. */
function Progress({ color }: { color: string }) {
  const { position, duration } = usePlayerProgress();
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <View style={progressStyles.track} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[progressStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { position: 'absolute', left: 24, right: 24, bottom: 0, height: 2, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2, borderRadius: 1 },
});

/** Drag or tap along the track to set the volume; arrow keys via the adjustable role on native. */
function VolumeSlider({ value, onChange, color, trackColor }: {
  value: number;
  onChange: (v: number) => void;
  color: string;
  trackColor: string;
}) {
  const width = useRef(1);
  const set = (e: GestureResponderEvent) => onChange(e.nativeEvent.locationX / width.current);
  return (
    <View
      style={sliderStyles.hit}
      onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={set}
      onResponderMove={set}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Volumen"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))}
    >
      <View pointerEvents="none" style={[sliderStyles.track, { backgroundColor: trackColor }]}>
        <View style={[sliderStyles.fill, { width: `${value * 100}%`, backgroundColor: color }]} />
      </View>
      <View pointerEvents="none" style={[sliderStyles.knob, { left: `${value * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  hit: { width: 84, height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  knob: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7 },
});

/** Floating "now playing" pill on every screen while a preview is loaded; hidden on its own screen. */
export function MiniPlayer() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pathname = usePathname();
  const { nowPlaying, isPlaying, loading, trackId, toggle, volume, setVolume } = usePlayer();
  const [showVolume, setShowVolume] = useState(false);

  if (!nowPlaying || !trackId || pathname === nowPlaying.href) return null;
  const playing = isPlaying || loading;

  return (
    <Animated.View entering={SlideInDown.springify().damping(16)} exiting={SlideOutRight.duration(450)} style={styles.dock}>
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
        {showVolume ? (
          <VolumeSlider value={volume} onChange={setVolume} color={theme.accent} trackColor={theme.border} />
        ) : null}
        <Pressable
          onPress={() => setShowVolume((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showVolume ? 'Ocultar volumen' : 'Volumen'}
          accessibilityState={{ expanded: showVolume }}
          hitSlop={6}
          style={(state) => [styles.iconButton, isFocused(state) && styles.focusRing]}
        >
          <Ionicons
            name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
            size={20}
            color={theme.ink}
          />
        </Pressable>
        <Pressable
          onPress={() => void toggle(trackId)}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
          hitSlop={8}
          style={(state) => [styles.button, isFocused(state) && styles.focusRing]}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={theme.onAccent} />
        </Pressable>
        <Progress color={theme.vivid[0]} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    dock: { position: 'absolute', left: 12, right: 12, bottom: 86, alignItems: 'center' },
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
    iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
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
