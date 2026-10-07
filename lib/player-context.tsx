import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getTrackPreviewUrl } from './tracks';

// Single global player: starting a track replaces whatever was playing.
interface PlayerContextType {
  /** Track currently loaded in the player (playing, paused or loading). */
  trackId: string | null;
  isPlaying: boolean;
  loading: boolean;
  /** Resolves false when no preview could be loaded for the track. */
  play: (trackId: string) => Promise<boolean>;
  pause: () => void;
  toggle: (trackId: string) => Promise<boolean>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// A preview that never reports isLoaded is treated as a playback failure (signed URLs expire).
const LOAD_TIMEOUT_MS = 8000;

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [trackId, setTrackId] = useState<string | null>(null);
  const request = useRef(0); // invalidates in-flight loads when another track is requested
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    async (id: string, refresh: boolean): Promise<boolean> => {
      const mine = ++request.current;
      const url = await getTrackPreviewUrl(id, refresh);
      if (mine !== request.current) return true; // superseded by a newer request
      if (!url) {
        setTrackId(null);
        return false;
      }
      player.replace(url);
      player.play();
      clearWatchdog();
      watchdog.current = setTimeout(() => {
        if (mine !== request.current || player.isLoaded) return;
        if (!refresh) void load(id, true); // one retry with a re-resolved URL
        else setTrackId(null);
      }, LOAD_TIMEOUT_MS);
      return true;
    },
    [player]
  );

  const play = useCallback(
    async (id: string) => {
      if (id === trackId && status.isLoaded) {
        if (status.duration > 0 && status.currentTime >= status.duration - 0.1) await player.seekTo(0);
        player.play();
        return true;
      }
      player.pause();
      setTrackId(id);
      return load(id, false);
    },
    [load, player, status.currentTime, status.duration, status.isLoaded, trackId]
  );

  const pause = useCallback(() => player.pause(), [player]);

  const toggle = useCallback(
    async (id: string) => {
      if (id === trackId && status.playing) {
        player.pause();
        return true;
      }
      return play(id);
    },
    [play, player, status.playing, trackId]
  );

  const value = useMemo(
    () => ({
      trackId,
      isPlaying: status.playing,
      loading: trackId !== null && !status.isLoaded,
      play,
      pause,
      toggle,
    }),
    [trackId, status.playing, status.isLoaded, play, pause, toggle]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};
