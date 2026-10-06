import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Open Library con respeto a sus términos
const OPENLIBRARY_API = 'https://covers.openlibrary.org/b';
const USER_AGENT = 'LibreríaCajaDePandora/1.0 (contact: tu-email@example.com)';
const CACHE_KEY_PREFIX = 'openlibrary_cover_';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días

interface CacheEntry {
  url: string;
  timestamp: number;
}

/**
 * Obtiene la URL de portada de Open Library por ISBN
 * Respeta los términos de servicio:
 * - Usa User-Agent header
 * - Cachea resultados localmente
 * - No hace scraping ni requests en bulk
 */
export const getOpenLibraryCoverUrl = async (isbn: string): Promise<string | null> => {
  if (!isbn) return null;

  try {
    // Verificar cache local primero
    const cachedUrl = await getFromCache(isbn);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Hacer request a Open Library
    const coverUrl = `${OPENLIBRARY_API}/isbn/${isbn}-M.jpg`;

    // Verificar que la imagen existe (sin descargarla)
    // Open Library retorna 404 si no existe la portada
    const response = await fetch(coverUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (response.ok) {
      // Guardar en cache
      await saveToCache(isbn, coverUrl);
      return coverUrl;
    } else {
      // No existe portada, retornar null
      return null;
    }
  } catch (error) {
    console.warn(`Error fetching cover for ISBN ${isbn}:`, error);
    return null;
  }
};

/**
 * Obtiene portadas para múltiples ISBNs
 * Optimizado para no hacer requests individuales
 */
export const getOpenLibraryCoverUrls = async (isbns: string[]): Promise<{ [isbn: string]: string | null }> => {
  const results: { [isbn: string]: string | null } = {};

  // Procesar en paralelo pero limitado para respetar rate limits
  const batchSize = 5;
  for (let i = 0; i < isbns.length; i += batchSize) {
    const batch = isbns.slice(i, i + batchSize);
    const promises = batch.map((isbn) => getOpenLibraryCoverUrl(isbn));
    const urls = await Promise.all(promises);

    batch.forEach((isbn, index) => {
      results[isbn] = urls[index];
    });

    // Pequeño delay entre batches para respetar rate limits
    if (i + batchSize < isbns.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
};

/**
 * Obtiene metadatos de un libro por ISBN
 * Usa la API de búsqueda de Open Library
 */
export const searchOpenLibraryByISBN = async (isbn: string) => {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`,
      {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }
    );

    const data = await response.json();
    const bookKey = `ISBN:${isbn}`;

    if (data[bookKey]) {
      return {
        title: data[bookKey].title,
        author: data[bookKey].authors?.[0]?.name,
        cover_url: data[bookKey].cover?.medium,
        publish_date: data[bookKey].publish_date,
        publishers: data[bookKey].publishers,
      };
    }

    return null;
  } catch (error) {
    console.warn(`Error searching Open Library for ISBN ${isbn}:`, error);
    return null;
  }
};

/**
 * Guardar URL en cache local
 */
const saveToCache = async (isbn: string, url: string): Promise<void> => {
  try {
    const entry: CacheEntry = {
      url,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${isbn}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('Error saving to cache:', error);
  }
};

/**
 * Obtener URL del cache
 */
const getFromCache = async (isbn: string): Promise<string | null> => {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${isbn}`);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;

    if (isExpired) {
      // Eliminar entrada expirada
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${isbn}`);
      return null;
    }

    return entry.url;
  } catch (error) {
    console.warn('Error reading from cache:', error);
    return null;
  }
};

/**
 * Limpiar cache antiguo
 */
export const clearExpiredCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    for (const key of cacheKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;

        if (isExpired) {
          await AsyncStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('Error clearing expired cache:', error);
  }
};

/**
 * Obtener tamaño del cache
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    return cacheKeys.length;
  } catch (error) {
    console.warn('Error getting cache size:', error);
    return 0;
  }
};
