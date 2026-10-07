import { Product } from './database';
import { getDiscogsCoverUrl } from './discogs';
import { getOpenLibraryCoverUrl } from './openlibrary';

type ProductImageSource = Pick<
  Product,
  'imageUrl' | 'category' | 'isbn' | 'discogs_id'
>;

// Covers are looked up once per session (Open Library / Discogs proxy), then reused by every card.
const coverCache = new Map<string, Promise<string | null>>();

export const resolveProductImageUrl = async (
  product: ProductImageSource
): Promise<string | null> => {
  if (product.imageUrl) {
    return product.imageUrl;
  }
  const key = `${product.category}:${product.isbn ?? ''}:${product.discogs_id ?? ''}`;
  let cover = coverCache.get(key);
  if (!cover) {
    cover = lookupCover(product).catch(() => null);
    coverCache.set(key, cover);
  }
  return cover;
};

const lookupCover = async (product: ProductImageSource): Promise<string | null> => {

  if (product.category === 'book' && product.isbn) {
    return getOpenLibraryCoverUrl(product.isbn);
  }

  if (product.category === 'vinyl' && product.discogs_id) {
    return getDiscogsCoverUrl(product.discogs_id);
  }

  return null;
};
