// 30 s previews from the public iTunes Search API (CORS-enabled, no key). Used for vinyl records,
// which have no per-track rows until the tracks backend is deployed (PHASES.md S.2).
const cache = new Map<string, string | null>();

export const getItunesPreviewUrl = async (artist: string | undefined, album: string): Promise<string | null> => {
  const term = [artist, album].filter(Boolean).join(' ').trim();
  if (!term) return null;
  if (cache.has(term)) return cache.get(term) ?? null;
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?media=music&entity=song&limit=10&term=${encodeURIComponent(term)}`
    );
    const json = await res.json();
    const results: { previewUrl?: string }[] = json?.results ?? [];
    const url = results.find((r) => typeof r.previewUrl === 'string' && r.previewUrl.startsWith('https://'))?.previewUrl ?? null;
    cache.set(term, url);
    return url;
  } catch {
    return null; // network/CORS failure: the caller shows "no preview"
  }
};
