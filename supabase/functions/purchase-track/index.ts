// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { corsHeaders, getCaller, jsonResponse } from '../_shared/http.ts';

// The client sends only which track and an idempotency key; the price is read from the DB.
// No payment provider yet: a purchase row is recorded directly (payment is a later, separate phase).
const bodySchema = z.object({ trackId: z.string().uuid(), idempotencyKey: z.string().min(8).max(128) });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return jsonResponse(req, { error: 'Unauthorized' }, 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse(req, { error: 'Bad request' }, 400);
  const { trackId, idempotencyKey } = parsed.data;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    console.error('Missing config: SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const columns = 'id, track_id, price_paid, created_at';
  const byKey = () =>
    db.from('track_purchases').select(columns).eq('user_id', caller.user.id).eq('idempotency_key', idempotencyKey).maybeSingle();

  try {
    // Replay of the same request: return the original purchase.
    const { data: existing } = await byKey();
    if (existing) {
      return existing.track_id === trackId
        ? jsonResponse(req, { purchase: existing })
        : jsonResponse(req, { error: 'Idempotency key already used' }, 422);
    }

    const { data: track } = await db.from('tracks').select('id, price').eq('id', trackId).maybeSingle();
    if (!track) return jsonResponse(req, { error: 'Not found' }, 404);

    const { data: purchase, error } = await db
      .from('track_purchases')
      .insert({ user_id: caller.user.id, track_id: track.id, price_paid: track.price, idempotency_key: idempotencyKey })
      .select(columns)
      .single();

    if (error?.code === '23505') {
      // Lost a race with the same idempotency key, otherwise the track is already owned.
      const { data: raced } = await byKey();
      return raced?.track_id === trackId
        ? jsonResponse(req, { purchase: raced })
        : jsonResponse(req, { error: 'Already purchased' }, 409);
    }
    if (error) {
      console.error('purchase-track insert failed', error);
      return jsonResponse(req, { error: 'Internal error' }, 500);
    }
    return jsonResponse(req, { purchase }, 201);
  } catch (e) {
    console.error('purchase-track error', e);
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
});
