export type WeeklyPick = { bookId: string; vinylId: string; discount: number };

/** Mirrors `place_order`: the discount applies once per complete book + record pair. The server stays the authority. */
export const bundleDiscount = (items: { id: string; precio: number; cantidad: number }[], pick: WeeklyPick | null) => {
  const book = pick && items.find((i) => i.id === pick.bookId);
  const record = pick && items.find((i) => i.id === pick.vinylId);
  if (!pick || !book || !record) return 0;
  return (Math.round((book.precio + record.precio) * pick.discount * 100) / 100) * Math.min(book.cantidad, record.cantidad);
};
