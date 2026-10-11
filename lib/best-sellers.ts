import { useSyncExternalStore } from 'react';

import { readCache } from './cache';
import { getTopBestSellers, type HomeData, type Product } from './database';

// Which products are best sellers (the home's top 5 books and top 5 records), so a card wears the
// badge in any section: recommendations, new arrivals, the catalog, "also bought".
let ids = new Set<string>();
let requested = false;
const listeners = new Set<() => void>();

export function setBestSellers({ books, vinyls }: { books: Product[]; vinyls: Product[] }) {
  requested = true;
  ids = new Set([...books, ...vinyls].map((p) => p.id));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!requested) {
    requested = true;
    const cached = readCache<HomeData>('home');
    if (cached) setBestSellers(cached);
    Promise.all([getTopBestSellers('book'), getTopBestSellers('vinyl')]).then(
      ([books, vinyls]) => setBestSellers({ books, vinyls }),
      () => {} // no badge beats a broken card
    );
  }
  return () => {
    listeners.delete(listener);
  };
}

export const useIsBestSeller = (id: string) =>
  useSyncExternalStore(subscribe, () => ids.has(id), () => false);
