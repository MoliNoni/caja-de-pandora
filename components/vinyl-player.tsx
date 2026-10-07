import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { showAlert } from '../lib/dialog';
import { usePlayer, type NowPlaying, type ResolvePreview } from '../lib/player-context';
import type { Theme } from '../constants/theme';

const TURN_MS = 1800; // 33⅓ rpm
const STOP_MS = 600; // decelerate to rest on pause
// Ease-out cubic starts at 3·d/T of the cruising speed: this arc keeps the speed continuous at pause.
const STOP_DEG = ((360 / TURN_MS) * STOP_MS) / 3;
const GROOVES = [0.46, 0.52, 0.58, 0.64, 0.7, 0.76, 0.82, 0.88, 0.94];

type Props = {
  trackId: string;
  title: string;
  coverUri?: string | null;
  size: number;
  /** Custom preview source (e.g. iTunes for whole records). Default: the track-preview Edge Function. */
  resolve?: ResolvePreview;
  /** Shown by the mini-player while this preview is loaded. */
  meta?: NowPlaying;
};

/** design.md#vinyl: black disc, cover as centre label, spins only while this track plays. */
export function VinylPlayer({ trackId, title, coverUri, size, resolve, meta }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const player = usePlayer();
  const active = player.trackId === trackId;
  // Spin from the tap, not from the first audio frame: loading a preview takes a moment.
  const playing = active && (player.isPlaying || player.loading);

  const rotation = useSharedValue(0);
  const arm = useSharedValue(0);
  const glow = useSharedValue(0);
  const lit = useSharedValue(0);
  const icon = useSharedValue(0); // 0 = play, 1 = pause

  const wasPlaying = useRef(false);

  useEffect(() => {
    const ms = reducedMotion ? 0 : 300;
    arm.value = withTiming(playing ? 22 : 0, { duration: ms, easing: Easing.out(Easing.ease) });
    icon.value = withTiming(playing ? 1 : 0, { duration: ms });
    lit.value = withTiming(playing ? 1 : 0, { duration: ms });
    if (playing && !reducedMotion) {
      glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: ms });
    }
    if (reducedMotion) {
      cancelAnimation(rotation);
    } else if (playing) {
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, { duration: TURN_MS, easing: Easing.linear }),
        -1
      );
    } else if (wasPlaying.current) {
      rotation.value = withTiming(rotation.value + STOP_DEG, {
        duration: STOP_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
    wasPlaying.current = playing;
  }, [playing, reducedMotion, rotation, arm, icon, glow, lit]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: lit.value * (0.55 + 0.35 * glow.value),
    transform: [{ scale: 1.04 + 0.06 * glow.value }],
  }));
  const armStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${arm.value}deg` }] }));
  const playIcon = useAnimatedStyle(() => ({
    opacity: 1 - icon.value,
    transform: [{ scale: 1 - 0.4 * icon.value }],
  }));
  const pauseIcon = useAnimatedStyle(() => ({
    opacity: icon.value,
    transform: [{ scale: 0.6 + 0.4 * icon.value }],
  }));

  const label = playing ? 'Pause preview' : 'Play preview';
  const onPress = async () => {
    if (!(await player.toggle(trackId, resolve, meta))) showAlert('Sin vista previa', 'No encontramos un fragmento para reproducir.');
  };

  const center = size * 0.38;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { width: size, height: size, borderRadius: size / 2, borderColor: theme.vivid[0], shadowColor: theme.vivid[5] },
            glowStyle,
          ]}
        />
        <Animated.View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }, spin]}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            {GROOVES.map((r) => (
              <Circle key={r} cx={size / 2} cy={size / 2} r={(size / 2) * r} fill="none" stroke="#2A2A2A" strokeWidth={1} />
            ))}
          </Svg>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={{ width: center, height: center, borderRadius: center / 2 }}
              accessibilityLabel={`Portada de ${title}`}
            />
          ) : (
            <View style={{ width: center, height: center, borderRadius: center / 2, backgroundColor: theme.accent }} />
          )}
          <View style={styles.spindle} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.arm, { height: size * 0.5, right: size * 0.04, top: -size * 0.02, transformOrigin: ['50%', 0, 0] }, armStyle]}
        />
      </View>

      <Pressable
        onPress={() => void onPress()}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: active && player.loading }}
        style={(state) => [styles.button, isFocused(state) && styles.focusRing]}
      >
        <Animated.View style={[styles.iconLayer, playIcon]}>
          <Ionicons name="play" size={26} color={theme.onAccent} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, pauseIcon]}>
          <Ionicons name="pause" size={26} color={theme.onAccent} />
        </Animated.View>
      </Pressable>

      {reducedMotion && playing ? <Text style={styles.status}>Reproduciendo</Text> : null}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: 16, marginBottom: 20 },
    glow: {
      position: 'absolute',
      borderWidth: 6,
      shadowOpacity: 0.9,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 0 },
      boxShadow: '0 0 48px rgba(224, 17, 95, 0.55), 0 0 90px rgba(124, 58, 237, 0.45)',
    },
    disc: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    spindle: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: theme.bg },
    // Tonearm: pale rod with a coloured cartridge at the tip.
    arm: {
      position: 'absolute',
      width: 8,
      borderRadius: 4,
      backgroundColor: '#D9D4E4',
      borderBottomWidth: 22,
      borderBottomColor: theme.vivid[0],
      boxShadow: '0 6px 14px rgba(0,0,0,0.45)',
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: theme.ink, outlineOffset: 2 },
    status: { fontSize: 14, color: theme.inkMuted },
  });
