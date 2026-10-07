import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Line, Rect, Stop } from 'react-native-svg';

import { isFocused } from '../hooks/focus';
import { useTheme, useThemedStyles } from '../hooks/use-theme';
import { showAlert } from '../lib/dialog';
import { usePlayer, type NowPlaying, type ResolvePreview } from '../lib/player-context';
import type { Theme } from '../constants/theme';

const TURN_MS = 1800; // 33⅓ rpm
const STOP_MS = 600; // decelerate to rest on pause
// Ease-out cubic starts at 3·d/T of the cruising speed: this arc keeps the speed continuous at pause.
const STOP_DEG = ((360 / TURN_MS) * STOP_MS) / 3;
// Fine grooves with a few brighter bands where the gaps between songs would be.
const GROOVES = Array.from({ length: 22 }, (_, i) => 0.42 + i * 0.026);
const GAPS = new Set([5, 11, 16]);
const ARM_PLAY_DEG = 24;

type Props = {
  trackId: string;
  title: string;
  coverUri?: string | null;
  size: number;
  /** Where the preview URL comes from (iTunes for records). */
  resolve: ResolvePreview;
  /** Shown by the mini-player while this preview is loaded. */
  meta?: NowPlaying;
};

/** design.md#vinyl: black disc, cover as centre label, spins only while this record plays. */
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
  // Sleeve reveal on mount: the sleeve slides off the record (0 → 1), then the record drops onto the platter.
  const sleeve = useSharedValue(reducedMotion ? 1 : 0);
  const drop = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      sleeve.value = 1;
      drop.value = 1;
      return;
    }
    sleeve.value = withDelay(250, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }));
    drop.value = withDelay(850, withSpring(1, { damping: 10, stiffness: 170 }));
  }, [reducedMotion, sleeve, drop]);

  const wasPlaying = useRef(false);

  useEffect(() => {
    const ms = reducedMotion ? 0 : 300;
    arm.value = withTiming(playing ? ARM_PLAY_DEG : 0, { duration: ms, easing: Easing.out(Easing.ease) });
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

  // Deck geometry, all relative to `size` (the deck width).
  const disc = size * 0.82;
  const spin = useAnimatedStyle((): ViewStyle => ({
    transform: [
      { translateX: -disc * 0.08 * sleeve.value * (1 - drop.value) },
      { translateY: -disc * 0.05 * (1 - drop.value) },
      { scale: 1.07 - 0.07 * drop.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  const sleeveStyle = useAnimatedStyle((): ViewStyle => ({
    opacity: sleeve.value < 0.6 ? 1 : (1 - sleeve.value) / 0.4,
    transform: [{ translateX: disc * 0.95 * sleeve.value }, { rotate: `${9 * sleeve.value}deg` }],
  }));
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

  const r = disc / 2;
  const discX = size * 0.03;
  const discY = size * 0.04;
  const deckH = disc + size * 0.08;
  const labelSize = disc * 0.38;
  const pivot = { x: size * 0.92, y: size * 0.1 };
  const armLen = size * 0.56;
  const discBox = { position: 'absolute' as const, left: discX, top: discY, width: disc, height: disc, borderRadius: r };

  return (
    <View style={styles.wrap}>
      <View style={[styles.deck, { width: size, height: deckH }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, discBox, { borderColor: theme.vivid[0], shadowColor: theme.vivid[5] }, glowStyle]}
        />
        <View style={[discBox, styles.platter]} />
        <Animated.View style={[discBox, styles.disc, spin]}>
          <Svg width={disc} height={disc} style={StyleSheet.absoluteFill}>
            {GROOVES.map((k, i) => (
              <Circle
                key={k}
                cx={r}
                cy={r}
                r={r * k}
                fill="none"
                stroke={GAPS.has(i) ? '#3A3A3A' : '#202020'}
                strokeWidth={GAPS.has(i) ? 1.5 : 1}
              />
            ))}
            <Circle cx={r} cy={r} r={labelSize / 2 + 5} fill="none" stroke={theme.vivid[0]} strokeWidth={3} />
          </Svg>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={{ width: labelSize, height: labelSize, borderRadius: labelSize / 2 }}
              accessibilityLabel={`Portada de ${title}`}
            />
          ) : (
            <View style={{ width: labelSize, height: labelSize, borderRadius: labelSize / 2, backgroundColor: theme.accent }} />
          )}
          <View style={styles.spindle} />
        </Animated.View>
        {/* Fixed sheen: light doesn't turn with the record, which is what sells the spin. */}
        <Svg pointerEvents="none" width={disc} height={disc} style={{ position: 'absolute', left: discX, top: discY }}>
          <Defs>
            <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0.2" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.36" stopColor="#FFFFFF" stopOpacity={0.13} />
              <Stop offset="0.46" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.56" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.66" stopColor="#FFFFFF" stopOpacity={0.09} />
              <Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill="url(#sheen)" />
        </Svg>
        <Animated.View pointerEvents="none" style={[discBox, styles.sleeve, sleeveStyle]}>
          {coverUri ? <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} /> : null}
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transformOrigin: [pivot.x, pivot.y, 0] }, armStyle]}
        >
          <Svg width={size} height={deckH}>
            <Rect x={pivot.x - size * 0.03} y={pivot.y - size * 0.11} width={size * 0.06} height={size * 0.07} rx={4} fill="#4A4458" />
            <Line
              x1={pivot.x}
              y1={pivot.y}
              x2={pivot.x}
              y2={pivot.y + armLen - size * 0.06}
              stroke="#D9D4E4"
              strokeWidth={size * 0.018}
              strokeLinecap="round"
            />
            <G>
              <Rect
                x={pivot.x - size * 0.03}
                y={pivot.y + armLen - size * 0.08}
                width={size * 0.06}
                height={size * 0.09}
                rx={3}
                fill={theme.vivid[0]}
              />
            </G>
            <Circle cx={pivot.x} cy={pivot.y} r={size * 0.05} fill="#2A2533" stroke="#5A5468" strokeWidth={2} />
            <Circle cx={pivot.x} cy={pivot.y} r={size * 0.016} fill="#D9D4E4" />
          </Svg>
        </Animated.View>
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
    deck: {
      borderRadius: 24,
      backgroundColor: '#17121F',
      borderWidth: 1,
      borderColor: '#2C2538',
      boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
    },
    platter: { backgroundColor: '#0A0A0A', transform: [{ scale: 1.03 }], boxShadow: '0 10px 30px rgba(0,0,0,0.6)' },
    sleeve: {
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: theme.accent,
      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
    },
    disc: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    spindle: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: theme.bg },
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
