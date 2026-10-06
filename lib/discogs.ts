import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Discogs API
const DISCOGS_API = 'https://api.discogs.com';
const DISCOGS_TOKEN = process.env.EXPO_PUBLIC_DISCOGS_TOKEN || ''; // Necesitas obtener un token de Discogs
const USER_AGENT = 'VinylStore/1.0 (contact: tu-email@example.com)';
const CACHE_KEY_PREFIX = 'discogs_cover_';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días

interface CacheEntry {
  url: string;
  timestamp: number;
}

/**
 * Obtiene la URL de portada de un release de Discogs por ID de release
 * Respeta los términos de servicio:
 * - Usa token de autenticación
 * - Cachea resultados localmente
 * - No hace requests en bulk
 */
export const getDiscogsCoverUrl = async (releaseId: string): Promise<string | null> => {
  if (!releaseId || !DISCOGS_TOKEN) return null;

  try {
    // Verificar cache local primero
    const cachedUrl = await getFromCache(releaseId);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Hacer request a Discogs
    const response = await fetch(`${DISCOGS_API}/releases/${releaseId}`, {
      headers: {
        'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

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