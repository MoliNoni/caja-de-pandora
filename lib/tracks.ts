import { supabase } from './supabase';

export interface Track {
  id: string;
  productId: string;
  position: string;
  title: string;
  durationS: number | null;
  price: number;
  previewUrl: string | null;
}

const COLUMNS = 'id, product_id, position, title, duration_s, price, preview_url';

const toTrack = (r: any): Track => ({
  id: String(r.id),
  productId: String(r.product_id),
  position: String(r.position),
  title: String(r.title),
  durationS: r.duration_s ?? null,
  price: Number(r.price),
  previewUrl: r.preview_url ?? null,
});

export const formatDuration = (s: number | null) =>
  s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const getTracksByProduct = async (productId: string): Promise<Track[]> => {
  const { data, error } = await supabase.from('tracks').select(COLUMNS).eq('product_id', productId);
  if (error) throw error;
  // Positions are text ("A1", "10"): natural order, not lexicographic.
  return (data ?? [])
    .map(toTrack)
    .sort((a, b) => a.position.localeCompare(b.position, undefined, { numeric: true }));
};

export const getTrackById = async (id: string): Promise<Track | null> => {
  const { data, error } = await supabase.from('tracks').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toTrack(data) : null;
};

// Admin only (the Edge Function checks is_admin). Adds missing tracks from the Discogs tracklist.
export const seedTracks = async (productId: string, discogsReleaseId: string, defaultPrice: number) => {
  const { data, error } = await supabase.functions.invoke('seed-tracks', {
    body: { productId, discogsReleaseId, defaultPrice },
  });
  if (error) throw error;
  return data as { success: true; parsed: number; inserted: number };
};

// 30 s preview URL resolved server-side. refresh = the cached URL failed to play (signed URLs expire).
export const getTrackPreviewUrl = async (trackId: string, refresh = false): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke('track-preview', { body: { trackId, refresh } });
  return error ? null : ((data?.previewUrl as string | undefined) ?? null);
};

export type PurchaseResult = 'purchased' | 'owned' | 'unauthorized' | 'error';

// Not security-sensitive: only deduplicates retries of one purchase attempt.
export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

// Price is resolved server-side; only the track id and an idempotency key are sent.
export const purchaseTrack = async (trackId: string, idempotencyKey: string): Promise<PurchaseResult> => {
  const { error } = await supabase.functions.invoke('purchase-track', { body: { trackId, idempotencyKey } });
  if (!error) return 'purchased';
  const status = (error as any).context?.status;
  return status === 401 ? 'unauthorized' : status === 409 ? 'owned' : 'error';
};

// Filtered by user_id explicitly: RLS lets admins read every purchase.
export const isTrackOwned = async (trackId: string): Promise<boolean> => {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return false;
  const { data } = await supabase
    .from('track_purchases')
    .select('id')
    .eq('track_id', trackId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};
