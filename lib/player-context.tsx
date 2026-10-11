import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioSampleListener } from 'expo-audio';
import { makeMutable, withTiming, type SharedValue } from 'react-native-reanimated';

// Single global player: starting a track replaces whatever was playing.
/** Resolves a playable URL; refresh = the previous URL failed to load. */
export type ResolvePreview = (refresh: boolean) => Promise<string | null>;
/** What the mini-player shows for the loaded preview. */
export type NowPlaying = { title: string; subtitle?: string; cover?: string | null; href: string };

interface PlayerContextType {
  /** Track currently loaded in the player (playing, paused or loading). */
  trackId: string | null;
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  loading: boolean;
  /** Resolves false when no preview could be loaded for the track. */
  play: (trackId: string, resolve: ResolvePreview, meta?: NowPlaying) => Promise<boolean>;
  pause: () => void;
  /** resolve may be omitted to resume the loaded preview (e.g. from the mini-player). */
  toggle: (trackId: string, resolve?: ResolvePreview, meta?: NowPlaying) => Promise<boolean>;
  /** Listener volume 0..1 (fades are applied on top of it). */
  volume: number;
  setVolume: (volume: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
// Position ticks 10x/s: kept in its own context so only progress UIs re-render on every tick.
const ProgressContext = createContext({ position: 0, duration: 0 });
/**
 * Loudness of the playing preview, 0..1, on the UI thread (no re-renders). `live` is 1 once real
 * samples arrive: iOS always; Android only with RECORD_AUDIO (never requested here); web never.
 * Without samples, visuals keep their own synthetic pulse.
 */
type AudioLevel = { level: SharedValue<number>; live: SharedValue<number> };
const AudioLevelContext = createContext<AudioLevel>({ level: makeMutable(0), live: makeMutable(0) });

// A preview that never reports isLoaded is treated as a playback failure (signed URLs expire).
const LOAD_TIMEOUT_MS = 8000;
const DEFAULT_VOLUME = 0.5;
const FADE_IN_S = 0.8;
const FADE_OUT_S = 5; // previews are 30 s clips: fade the tail instead of stopping dead

// Static web rendering runs in Node, which has no <audio>: expo-audio threw there and every page
// fell back to client-only rendering (an empty page until the bundle loaded, a flash on each F5).
// The server gets an idle player; it renders the same children, so hydration still matches.
const idlePlayer: PlayerContextType = {
  trackId: null,
  nowPlaying: null,
  isPlaying: false,
  loading: false,
  play: async () => false,
  pause: () => {},
  toggle: async () => false,
  volume: DEFAULT_VOLUME,
  setVolume: () => {},
};

export const PlayerProvider = ({ children }: { children: React.ReactNode }) =>
  typeof window === 'undefined' ? (
    <PlayerContext.Provider value={idlePlayer}>{children}</PlayerContext.Provider>
  ) : (
    <AudioPlayerProvider>{children}</AudioPlayerProvider>
  );

const AudioPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const loadedTrackId = useRef<string | null>(null); // id of the source actually loaded in the player
  const request = useRef(0); // invalidates in-flight loads when another track is requested
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolve = useRef<ResolvePreview | null>(null); // source of the loaded preview
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [audioLevel] = useState<AudioLevel>(() => ({ level: makeMutable(0), live: makeMutable(0) }));

  useAudioSampleListener(player, (sample) => {
    const frames = sample.channels[0]?.frames;
    if (!frames?.length) return;
    let sum = 0;
    for (let i = 0; i < frames.length; i += 4) sum += frames[i] * frames[i];
    const rms = Math.sqrt(sum / Math.ceil(frames.length / 4));
    // ponytail: fixed gain, tuned by ear for music previews; normalise per track if levels vary a lot.
    audioLevel.level.value = withTiming(Math.min(1, rms * 3.5), { duration: 90 });
    audioLevel.live.value = 1;
  });

  // Effective gain = listener volume x fade-in x fade-out. Re-applied every tick because the web
  // player builds a fresh <audio> (volume 1) on each replace().
  const { currentTime, duration, playing, didJustFinish } = status;
  useEffect(() => {
    const fadeIn = Math.min(1, currentTime / FADE_IN_S);
    const fadeOut = duration > 0 ? Math.min(1, Math.max(0, (duration - currentTime) / FADE_OUT_S)) : 1;
    player.volume = volume * Math.min(fadeIn, fadeOut);
  }, [player, volume, currentTime, duration, playing]);

  // Clip over: unload it so the record stops and the mini-player slides away.
  // Fall back to the synthetic pulse until the next clip proves it delivers samples.
  useEffect(() => {
    audioLevel.live.value = 0;
    audioLevel.level.value = 0;
  }, [audioLevel, trackId]);

  useEffect(() => {
    if (didJustFinish) {
      setTrackId(null);
      loadedTrackId.current = null;
    }
  }, [didJustFinish]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const clearWatchdog = () => {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  };
  useEffect(() => clearWatchdog, []);
  useEffect(() => {
    if (status.isLoaded) clearWatchdog();
  }, [status.isLoaded]);

  const load = useCallback(
    async (id: string, refresh: boolean, resolve: ResolvePreview): Promise<boolean> => {
      const mine = ++request.current;
      const url = await resolve(refresh);
      if (mine !== request.current) return true; // superseded by a newer request
      if (!url) {
        setTrackId(null);
        return false;
      }
      player.replace(url);
      loadedTrackId.current = id;
      player.play();
      clearWatchdog();
      watchdog.current = setTimeout(() => {
        if (mine !== request.current || player.isLoaded) return;
        if (!refresh) void load(id, true, resolve); // one retry with a re-resolved URL
        else setTrackId(null);
      }, LOAD_TIMEOUT_MS);
      return true;
    },
    [player]
  );

  const play = useCallback(
    async (id: string, resolve: ResolvePreview, meta?: NowPlaying) => {
      if (meta) setNowPlaying(meta);
      lastResolve.current = resolve;
      if (id === trackId && loadedTrackId.current === id && status.isLoaded) {
        if (status.duration > 0 && status.currentTime >= status.duration - 0.1) await player.seekTo(0);
        player.play();
        return true;
      }
      player.pause();
      setTrackId(id);
      return load(id, false, resolve);
    },
    [load, player, status.currentTime, status.duration, status.isLoaded, trackId]
  );

  const pause = useCallback(() => player.pause(), [player]);

  const toggle = useCallback(
    async (id: string, resolve?: ResolvePreview, meta?: NowPlaying) => {
      if (id === trackId && status.playing) {
        player.pause();
        return true;
      }
      const source = resolve ?? (id === trackId ? lastResolve.current : null);
      return source ? play(id, source, meta) : false;
    },
    [play, player, status.playing, trackId]
  );

  const value = useMemo(
    () => ({
      trackId,
      nowPlaying: trackId ? nowPlaying : null,
      isPlaying: status.playing,
      loading: trackId !== null && !status.isLoaded,
      play,
      pause,
      toggle,
      volume,
      setVolume: (v: number) => setVolume(Math.min(1, Math.max(0, v))),
    }),
    [trackId, nowPlaying, status.playing, status.isLoaded, play, pause, toggle, volume]
  );
  const progress = useMemo(
    () => ({ position: trackId ? currentTime : 0, duration: trackId ? duration : 0 }),
    [trackId, currentTime, duration]
  );

  return (
    <PlayerContext.Provider value={value}>
      <ProgressContext.Provider value={progress}>
        <AudioLevelContext.Provider value={audioLevel}>{children}</AudioLevelContext.Provider>
      </ProgressContext.Provider>
    </PlayerContext.Provider>
  );
};

export const usePlayerProgress = () => useContext(ProgressContext);
export const useAudioLevel = () => useContext(AudioLevelContext);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};
