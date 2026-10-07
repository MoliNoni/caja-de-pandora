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
  return data as { success: true; count: number };
};
