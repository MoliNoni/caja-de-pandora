import { useCallback, useLayoutEffect, useState } from 'react';
import { Platform } from 'react-native';

// Last-known screen data, in memory and (web) localStorage, so a tab or an F5 paints instantly
// and then refreshes. Only public catalog data goes here, never user data.
const PREFIX = 'bv:v1:';
const memory = new Map<string, unknown>();

const storage = (): Storage | null => {
  try {
    return Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // blocked storage (private mode, sandboxed iframe)
  }
};

export function readCache<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = storage()?.getItem(PREFIX + key);
    if (raw == null) return undefined;
    const value = JSON.parse(raw) as T;
    memory.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

export function writeCache(key: string, value: unknown) {
  memory.set(key, value);
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota or blocked storage: the memory copy still serves this session
  }
}

/**
 * State backed by the cache. The first render matches the static HTML (no hydration mismatch);
 * the stored value is applied in a layout effect, i.e. before the browser paints.
 */
export function useCachedState<T>(key: string) {
  const [value, setValue] = useState<T | undefined>(() => (memory.has(key) ? (memory.get(key) as T) : undefined));
  useLayoutEffect(() => {
    const stored = readCache<T>(key);
    if (stored !== undefined) setValue(stored);
  }, [key]);
  const set = useCallback(
    (next: T) => {
      writeCache(key, next);
      setValue(next);
    },
    [key]
  );
  return [value, set] as const;
}
