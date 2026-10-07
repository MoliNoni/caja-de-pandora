import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Configuración de Discogs API
const CACHE_KEY_PREFIX = 'discogs_cover_';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días

interface CacheEntry {
  url: string;
  timestamp: number;
}

/**
 * Obtiene la URL de portada de un release de Discogs por ID de release
 * Respeta los términos de servicio:
 * - El token vive en la Edge Function discogs-proxy, nunca en el cliente
 * - Cachea resultados localmente
 * - No hace requests en bulk
 */
export const getDiscogsCoverUrl = async (releaseId: string): Promise<string | null> => {
  if (!releaseId) return null;

  try {
    // Verificar cache local primero
    const cachedUrl = await getFromCache(releaseId);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Hacer request a Discogs a través del proxy
    const { data, error } = await supabase.functions.invoke('discogs-proxy', {
      body: { path: `releases/${releaseId}` },
    });

    if (error || !data) {
      return null;
    }

    // Buscar la imagen primaria
    const primaryImage = data.images?.find((img: any) => img.type === 'primary') || data.images?.[0];
    if (primaryImage?.uri) {
      // Guardar en cache
      await saveToCache(releaseId, primaryImage.uri);
      return primaryImage.uri;
    }

    return null;
  } catch (error) {
    console.error('Error fetching Discogs cover:', error);
    return null;
  }
};

// Funciones de cache
const getFromCache = async (key: string): Promise<string | null> => {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_DURATION) {
        return entry.url;
      } else {
        // Cache expirado, eliminar
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }
  return null;
};

const saveToCache = async (key: string, url: string): Promise<void> => {
  try {
    const entry: CacheEntry = { url, timestamp: Date.now() };
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
};
/** Everything the admin form can prefill from a Discogs release. Null when the release is unknown. */
export type RecordLookup = {
  titulo?: string;
  autor?: string;
  sello?: string;
  anio?: string;
  /** Broad genres first, then styles: the form reuses whichever matches an existing category. */
  generos: string[];
  cover: string | null;
};

// One proxy request per release per session, shared by the admin lookup and the tracklist.
const releaseCache = new Map<string, Promise<any | null>>();
const fetchRelease = (releaseId: string) => {
  const id = releaseId.trim();
  if (!/^\d{1,12}$/.test(id)) return Promise.resolve(null);
  let pending = releaseCache.get(id);
  if (!pending) {
    pending = supabase.functions
      .invoke('discogs-proxy', { body: { path: `releases/${id}` } })
      .then(({ data, error }) => (error || !data?.title ? null : data))
      .catch(() => {
        releaseCache.delete(id); // network failure: retry next time
        return null;
      });
    releaseCache.set(id, pending);
  }
  return pending;
};

export type Track = { position: string; title: string; duration: string };

/** Songs of a release (headings and index rows dropped); empty when unknown. */
export const getDiscogsTracklist = async (releaseId: string): Promise<Track[]> => {
  const data = await fetchRelease(releaseId);
  return (data?.tracklist ?? [])
    .filter((t: any) => (t.type_ ?? 'track') === 'track' && t.title)
    .map((t: any) => ({ position: String(t.position ?? ''), title: String(t.title), duration: String(t.duration ?? '') }));
};

export const lookupDiscogsRelease = async (releaseId: string): Promise<RecordLookup | null> => {
  const data = await fetchRelease(releaseId);
  if (!data) return null;
  const image = data.images?.find((img: any) => img.type === 'primary') ?? data.images?.[0];
  return {
    titulo: data.title,
    // Discogs disambiguates homonyms as "Name (2)": drop the suffix.
    autor: data.artists?.map((a: any) => String(a.name).replace(/\s\(\d+\)$/, '')).join(', ') || undefined,
    sello: data.labels?.[0]?.name?.replace(/\s\(\d+\)$/, ''),
    anio: data.year ? String(data.year) : undefined,
    generos: [...(data.genres ?? []), ...(data.styles ?? [])],
    cover: image?.uri ?? null,
  };
};
