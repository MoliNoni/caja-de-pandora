import { Platform } from 'react-native';

// 30 s previews from the public iTunes Search API (no key), played on vinyl product pages.
const cache = new Map<string, string | null>();

type SearchResponse = { results?: { previewUrl?: string }[] };

const JSONP_TIMEOUT_MS = 8000;
let jsonpSeq = 0;

// Web uses JSONP: iTunes sits behind Akamai and some edges answer without CORS headers,
// which makes fetch() fail in the browser. A <script> load is not subject to CORS.
function jsonp(url: string): Promise<SearchResponse> {
  return new Promise((resolve, reject) => {
    const name = `__itunes_cb_${++jsonpSeq}`;
    const script = document.createElement('script');
    const g = globalThis as unknown as Record<string, unknown>;
    const done = () => {
      clearTimeout(timer);
      delete g[name];
      script.remove();
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error('iTunes JSONP timeout'));
    }, JSONP_TIMEOUT_MS);
    g[name] = (data: SearchResponse) => {
      done();
      resolve(data);
    };
    script.onerror = () => {
      done();
      reject(new Error('iTunes JSONP failed'));
    };
    script.src = `${url}&callback=${name}`;
    document.head.appendChild(script);
  });
}

export const getItunesPreviewUrl = async (artist: string | undefined, album: string): Promise<string | null> => {
  const term = [artist, album].filter(Boolean).join(' ').trim();
  if (!term) return null;
  if (cache.has(term)) return cache.get(term) ?? null;
  const url = `https://itunes.apple.com/search?media=music&entity=song&limit=10&term=${encodeURIComponent(term)}`;
  try {
    const json: SearchResponse = Platform.OS === 'web' ? await jsonp(url) : await (await fetch(url)).json();
    const preview = json.results?.find((r) => typeof r.previewUrl === 'string' && r.previewUrl.startsWith('https://'))?.previewUrl ?? null;
    cache.set(term, preview);
    return preview;
  } catch (error) {
    console.warn('iTunes preview lookup failed:', error);
    return null; // not cached: a later tap retries
  }
};
