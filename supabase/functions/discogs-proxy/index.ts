// @ts-nocheck
import { z } from 'npm:zod@3';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

// Only these Discogs paths can be requested through the proxy.
const bodySchema = z.object({ path: z.string().regex(/^(releases|masters)\/\d{1,12}$/) });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  // Read-only, allow-listed paths: anon-key callers are fine (the platform verifies the JWT).
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse(req, { error: 'Bad request' }, 400);

  const token = Deno.env.get('DISCOGS_TOKEN');
  if (!token) return jsonResponse(req, { error: 'Internal error' }, 500);

  try {
    const response = await fetch(`https://api.discogs.com/${parsed.data.path}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': Deno.env.get('DISCOGS_USER_AGENT') ?? 'VinylStore/1.0',
      },
    });
    if (!response.ok) {
      console.error('discogs upstream failure', response.status);
      const status = response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      return jsonResponse(req, { error: status === 404 ? 'Not found' : status === 429 ? 'Rate limited' : 'Upstream error' }, status);
    }
    return jsonResponse(req, await response.json());
  } catch (e) {
    console.error('discogs-proxy error', e);
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
});
