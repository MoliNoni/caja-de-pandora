import { genreRows } from '../lib/genre-rows';
import type { Product } from '../lib/database';

const product = (id: string, genero: string) => ({ id, genero }) as Product;

describe('genreRows', () => {
  const rows = genreRows(
    [product('1', 'Rock'), product('2', ''), product('3', 'Jazz'), product('4', 'Rock'), product('5', 'Rock')],
    2
  );

  it('puts the biggest genre first and untagged products last', () => {
    expect(rows.filter((r) => r.type === 'genre').map((r) => r.type === 'genre' && r.genre)).toEqual(['Rock', 'Jazz', 'Otros']);
  });

  it('chunks each genre into rows of `columns` cards with a running stagger index', () => {
    const cards = rows.filter((r) => r.type === 'cards');
    expect(cards.map((r) => r.type === 'cards' && r.products.map((p) => p.id))).toEqual([['1', '4'], ['5'], ['3'], ['2']]);
    expect(cards.map((r) => r.type === 'cards' && r.start)).toEqual([0, 2, 3, 4]);
  });
});
