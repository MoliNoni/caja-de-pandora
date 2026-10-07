import { Product } from './database';
import { getDiscogsCoverUrl } from './discogs';
import { getOpenLibraryCoverUrl } from './openlibrary';

type ProductImageSource = Pick<
  Product,
  'imageUrl' | 'category' | 'isbn' | 'discogs_id'
>;

// Covers are looked up once per session (Open Library / Discogs proxy), then reused by every card.
const coverCache = new Map<string, Promise<string | null>>();
const resolved = new Map<string, string | null>(); // settled lookups, readable synchronously

const coverKey = (p: ProductImageSource) => `${p.category}:${p.isbn ?? ''}:${p.discogs_id ?? ''}`;

/** Cover already known without waiting: undefined = still unknown (show a neutral block). */
export const peekProductImageUrl = (product: ProductImageSource): string | null | undefined =>
  product.imageUrl || resolved.get(coverKey(product));

export const resolveProductImageUrl = async (
  product: ProductImageSource
): Promise<string | null> => {
  if (product.imageUrl) {
    return product.imageUrl;
  }
  const key = coverKey(product);
  let cover = coverCache.get(key);
  if (!cover) {
    cover = lookupCover(product)
      .catch(() => null)
      .then((url) => {
        resolved.set(key, url);
        return url;
      });
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
