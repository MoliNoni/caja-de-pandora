import { Product } from './database';
import { getDiscogsCoverUrl } from './discogs';
import { getOpenLibraryCoverUrl } from './openlibrary';

type ProductImageSource = Pick<
  Product,
  'imageUrl' | 'category' | 'isbn' | 'discogs_id'
>;

export const resolveProductImageUrl = async (
  product: ProductImageSource
): Promise<string | null> => {
  if (product.imageUrl) {
    return product.imageUrl;
  }

  if (product.category === 'book' && product.isbn) {
    return getOpenLibraryCoverUrl(product.isbn);
  }

  if (product.category === 'vinyl' && product.discogs_id) {
    return getDiscogsCoverUrl(product.discogs_id);
  }

  return null;
};
