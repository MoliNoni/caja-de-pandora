// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

// Public (anon key is enough). Server-side because Deezer sends no CORS headers.
// Deezer preview URLs are signed and can expire: `refresh: true` re-resolves and re-caches.
const bodySchema = z.object({ trackId: z.string().uuid(), refresh: z.boolean().optional() });

const getJson = async (url: string) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.error('preview upstream failure', new URL(url).host, res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('preview upstream error', new URL(url).host, e);
    return null;
  }
};

const clean = (s: string) => s.replace(/["\\]/g, ' ').trim();

// Deezer: by cached id, then ISRC, then artist/title search.
const fromDeezer = async (track: any, artist: string) => {
  const urls = [
    track.deezer_id && `https://api.deezer.com/track/${track.deezer_id}`,
    track.isrc && `https://api.deezer.com/track/isrc:${encodeURIComponent(track.isrc)}`,
  ].filter(Boolean);
  for (const url of urls) {
    const d = await getJson(url);
    if (d?.preview) return { previewUrl: d.preview, deezerId: d.id ?? null };
  }
  const q = encodeURIComponent(`artist:"${clean(artist)}" track:"${clean(track.title)}"`);
  const search = await getJson(`https://api.deezer.com/search?q=${q}&limit=1`);
  const hit = search?.data?.[0];
  return hit?.preview ? { previewUrl: hit.preview, deezerId: hit.id ?? null } : null;
};

const fromItunes = async (track: any, artist: string) => {
  const term = encodeURIComponent(`${clean(artist)} ${clean(track.title)}`);
  const d = await getJson(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`);
  const url = d?.results?.[0]?.previewUrl;
  return url ? { previewUrl: url, deezerId: null } : null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse(req, { error: 'Bad request' }, 400);
  const { trackId, refresh } = parsed.data;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    console.error('Missing config: SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  try {
    const { data: track } = await db
      .from('tracks')
      .select('id, title, isrc, deezer_id, preview_url, product:product_id(autor)')
      .eq('id', trackId)
      .maybeSingle();
    if (!track) return jsonResponse(req, { error: 'Not found' }, 404);

    if (track.preview_url && !refresh) return jsonResponse(req, { previewUrl: track.preview_url });

    const artist = track.product?.autor ?? '';
    const found = (await fromDeezer(track, artist)) ?? (await fromItunes(track, artist));
    if (!found) return jsonResponse(req, { error: 'No preview available' }, 404);

    const { error } = await db
      .from('tracks')
      .update({ preview_url: found.previewUrl, deezer_id: found.deezerId ?? track.deezer_id })
      .eq('id', track.id);
    if (error) console.error('track-preview cache write failed', error); // still serve the preview
    return jsonResponse(req, { previewUrl: found.previewUrl });
  } catch (e) {
    console.error('track-preview error', e);
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
});
