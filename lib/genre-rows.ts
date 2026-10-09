import type { Product } from './database';

export type Row =
  | { type: 'genre'; key: string; genre: string; count: number }
  | { type: 'cards'; key: string; products: Product[]; start: number };

/** One section per genre (biggest first, untagged last), each chunked into grid rows; one virtualized list. */
export const genreRows = (products: Product[], columns: number): Row[] => {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const genre = p.genero.trim() || 'Otros';
    groups.set(genre, [...(groups.get(genre) ?? []), p]);
  }
  const sorted = [...groups].sort(([a, x], [b, y]) =>
    (a === 'Otros' ? 1 : 0) - (b === 'Otros' ? 1 : 0) || y.length - x.length || a.localeCompare(b, 'es'));
  const rows: Row[] = [];
  let index = 0;
  for (const [genre, items] of sorted) {
    rows.push({ type: 'genre', key: `g:${genre}`, genre, count: items.length });
    for (let i = 0; i < items.length; i += columns) {
      rows.push({ type: 'cards', key: `c:${genre}:${i}`, products: items.slice(i, i + columns), start: index + i });
    }
    index += items.length;
  }
  return rows;
};
