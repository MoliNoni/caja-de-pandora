// @ts-nocheck
import { z } from 'npm:zod@3';
import { corsHeaders, getCaller, jsonResponse } from '../_shared/http.ts';

// Only these Discogs paths can be requested through the proxy.
const bodySchema = z.object({ path: z.string().regex(/^(releases|masters)\/\d{1,12}$/) });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return jsonResponse(req, { error: 'Unauthorized' }, 401);

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
    if (!response.ok) return jsonResponse(req, { error: 'Not found' }, response.status === 404 ? 404 : 502);
    return jsonResponse(req, await response.json());
  } catch {
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
});
