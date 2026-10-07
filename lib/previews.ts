import { Platform } from 'react-native';

// 30 s previews for vinyl product pages from public catalogs (no keys): iTunes first, Deezer as fallback.
// Web loads both via JSONP: iTunes sits behind Akamai and some edges answer without CORS headers,
// and Deezer sends none at all, so fetch() fails in the browser. A <script> load is not subject to CORS.
const cache = new Map<string, string | null>();

const JSONP_TIMEOUT_MS = 8000;
let jsonpSeq = 0;

function jsonp<T>(url: string, callbackParam: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const name = `__preview_cb_${++jsonpSeq}`;
    const script = document.createElement('script');
    const g = globalThis as unknown as Record<string, unknown>;
    const done = () => {
      clearTimeout(timer);
      delete g[name];
      script.remove();
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error(`timeout: ${url}`));
    }, JSONP_TIMEOUT_MS);
    g[name] = (data: T) => {
      done();
      resolve(data);
    };
    script.onerror = () => {
      done();
      reject(new Error(`script blocked or failed: ${url}`));
    };
    script.src = `${url}&${callbackParam}=${name}`;
    document.head.appendChild(script);
  });
}

const getJson = <T,>(url: string, callbackParam: string): Promise<T> =>
  Platform.OS === 'web' ? jsonp<T>(url, callbackParam) : fetch(url).then((r) => r.json() as Promise<T>);

const isHttps = (u: unknown): u is string => typeof u === 'string' && u.startsWith('https://');

async function fromItunes(term: string) {
  const json = await getJson<{ results?: { previewUrl?: string }[] }>(
    `https://itunes.apple.com/search?media=music&entity=song&limit=10&term=${encodeURIComponent(term)}`,
    'callback'
  );
  return json.results?.map((r) => r.previewUrl).find(isHttps) ?? null;
}

async function fromDeezer(term: string) {
  const json = await getJson<{ data?: { preview?: string }[] }>(
    `https://api.deezer.com/search?limit=10&output=jsonp&q=${encodeURIComponent(term)}`,
    'callback'
  );
  return json.data?.map((r) => r.preview).find(isHttps) ?? null;
}

export const getRecordPreviewUrl = async (artist: string | undefined, album: string): Promise<string | null> => {
  const term = [artist, album].filter(Boolean).join(' ').trim();
  if (!term) return null;
  if (cache.has(term)) return cache.get(term) ?? null;
  let failed = false;
  for (const [label, source] of [['iTunes', fromItunes], ['Deezer', fromDeezer]] as const) {
    try {
      const url = await source(term);
      if (url) {
        cache.set(term, url);
        return url;
      }
    } catch (error) {
      failed = true;
      console.warn(`[preview] ${label} failed for "${term}":`, error);
    }
  }
  if (!failed) cache.set(term, null); // both answered "no match": don't ask again this session
  return null;
};
