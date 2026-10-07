// @ts-nocheck
import { z } from 'npm:zod@3';
import { corsHeaders, getCaller, jsonResponse } from '../_shared/http.ts';

const bodySchema = z.object({
  productId: z.string().uuid(),
  discogsReleaseId: z.string().regex(/^\d{1,12}$/),
  defaultPrice: z.number().min(0).max(1000),
});

// "m:ss" or "h:mm:ss" -> seconds; anything else -> null.
const parseDuration = (value: unknown): number | null => {
  const m = /^(?:(\d+):)?(\d{1,3}):(\d{2})$/.exec(String(value ?? '').trim());
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return jsonResponse(req, { error: 'Unauthorized' }, 401);

  const { data: isAdmin } = await caller.client.rpc('is_admin');
  if (isAdmin !== true) return jsonResponse(req, { error: 'Forbidden' }, 403);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse(req, { error: 'Bad request' }, 400);
  const { productId, discogsReleaseId, defaultPrice } = parsed.data;

  const token = Deno.env.get('DISCOGS_TOKEN');
  if (!token) {
    console.error('Missing config: DISCOGS_TOKEN');
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }

  try {
    const response = await fetch(`https://api.discogs.com/releases/${discogsReleaseId}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': Deno.env.get('DISCOGS_USER_AGENT') ?? 'VinylStore/1.0',
      },
    });
    if (!response.ok) {
      console.error('discogs upstream failure', response.status);
      const notFound = response.status === 404;
      return jsonResponse(req, { error: notFound ? 'Release not found' : 'Upstream error' }, notFound ? 404 : 502);
    }
    const release = await response.json();

    // Release-level ISRC identifiers are matched to a track only when their description names its position.
    // assumed: verify in Phase S (Discogs identifier descriptions vary per release)
    const isrcs = (release.identifiers ?? []).filter((i: any) => String(i.type).toUpperCase() === 'ISRC');
    const isrcFor = (position: string) =>
      isrcs.find((i: any) => new RegExp(`\\b${escapeRegExp(position)}\\b`, 'i').test(i.description ?? ''))?.value ?? null;

    // Dedupe by position (the unique key); headings/indexes are skipped.
    const rows = new Map<string, any>();
    (release.tracklist ?? [])
      .filter((t: any) => t.type_ === 'track' && t.title)
      .forEach((t: any, i: number) => {
        const position = String(t.position || i + 1).trim();
        if (rows.has(position)) return;
        rows.set(position, {
          product_id: productId,
          position,
          title: String(t.title).slice(0, 300),
          duration_s: parseDuration(t.duration),
          price: defaultPrice,
          isrc: isrcFor(position),
        });
      });
    if (rows.size === 0) return jsonResponse(req, { error: 'No tracks found' }, 422);

    // ignoreDuplicates: re-seeding adds missing tracks and never resets prices edited by an admin.
    // Runs with the caller's JWT, so the admin-only RLS policy is enforced as well.
    const { data: inserted, error } = await caller.client
      .from('tracks')
      .upsert([...rows.values()], { onConflict: 'product_id,position', ignoreDuplicates: true })
      .select('id');
    if (error) {
      console.error('seed-tracks upsert failed', error);
      const noProduct = error.code === '23503';
      return jsonResponse(req, { error: noProduct ? 'Product not found' : 'Internal error' }, noProduct ? 404 : 500);
    }
    return jsonResponse(req, { success: true, parsed: rows.size, inserted: inserted?.length ?? 0 });
  } catch (e) {
    console.error('seed-tracks error', e);
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
});
