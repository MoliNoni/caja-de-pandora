import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
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
import { usePlayer, type NowPlaying, type ResolvePreview } from '../lib/player-context';

/** One equalizer bar; each bar breathes at its own pace so the three never move in lockstep. */
function Bar({ ms, color, playing }: { ms: number; color: string; playing: boolean }) {
  const reducedMotion = useReducedMotion();
  const h = useSharedValue(0.35);
  useEffect(() => {
    if (!playing || reducedMotion) {
      cancelAnimation(h);
      h.value = withTiming(0.35, { duration: 200 });
      return;
    }
    const ease = { duration: ms, easing: Easing.inOut(Easing.sin) };
    h.value = withRepeat(withSequence(withTiming(1, ease), withTiming(0.25, ease)), -1);
  }, [playing, reducedMotion, ms, h]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

type Props = { trackId: string; resolve: ResolvePreview; meta?: NowPlaying; label: string };

/**
 * Plays a preview through the global player (so the mini-player takes over when you leave the page).
 * Renders nothing until a preview is known to exist.
 */
export function ListenButton({ trackId, resolve, meta, label }: Props) {
  const theme = useTheme();
  const themed = useThemedStyles(makeStyles);
  const player = usePlayer();
  const [available, setAvailable] = useState(false);

  // Resolving up front also keeps the tap inside the browser's user-gesture window.
  useEffect(() => {
    let alive = true;
    setAvailable(false);
    resolve(false).then((url) => alive && setAvailable(!!url));
    return () => {
      alive = false;
    };
  }, [resolve]);

  if (!available) return null;

  const active = player.trackId === trackId;
  const loading = active && player.loading;
  const playing = active && player.isPlaying;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={themed.wrap}>
      <Pressable
        onPress={() => void player.toggle(trackId, resolve, meta)}
        accessibilityRole="button"
        accessibilityLabel={playing ? `Pausar: ${label}` : label}
        accessibilityState={{ busy: loading }}
        style={(state) => [themed.pill, state.pressed && themed.pressed, isFocused(state) && themed.focusRing]}
      >
        <View style={themed.icon}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : playing ? (
            <View style={styles.bars}>
              {[420, 300, 520].map((ms) => (
                <Bar key={ms} ms={ms} color={theme.accent} playing />
              ))}
            </View>
          ) : (
            <Ionicons name="headset" size={18} color={theme.accent} />
          )}
        </View>
        <Text style={themed.text}>{playing ? 'Pausar' : label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 16 },
  bar: { width: 3, height: 16, borderRadius: 2 },
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { alignSelf: 'flex-start', marginTop: 12 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 9,
      paddingLeft: 12,
      paddingRight: 16,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: t.accent,
    },
    pressed: { transform: [{ scale: 0.97 }] },
    icon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    text: { fontSize: 14, fontWeight: '800', color: t.accent },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: t.accent, outlineOffset: 2 },
  });
