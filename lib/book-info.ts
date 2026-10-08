import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOpenLibraryCoverUrl, getOpenLibrarySynopsis, searchOpenLibraryByISBN } from './openlibrary';

// The store is in Spanish: a synopsis is only shown when it is in Spanish.
// Sources in order: Open Library (if Spanish), Spanish Wikipedia (book pages only), the catalog
// description (if Spanish). Both APIs allow any origin, so web fetches need no proxy.

const ES = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'por', 'con', 'para', 'se', 'su', 'es', 'lo', 'al', 'como']);
const EN = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'that', 'with', 'for', 'his', 'her', 'was', 'as', 'by', 'from', 'this', 'are', 'on']);

/** Stop-word vote: cheap and good enough to tell Spanish prose from English (or other) prose. */
export const isSpanish = (text: string) => {
  let es = 0;
  let en = 0;
  for (const word of text.toLowerCase().match(/[a-záéíóúñü]+/g) ?? []) {
    if (ES.has(word)) es++;
    else if (EN.has(word)) en++;
  }
  return es >= 3 && es > en * 2;
};

// Wikipedia page descriptions that mean "this page is about a book".
const BOOK_PAGE = /novela|libro|obra|ensayo|cuento|relato|poema|poes[ií]a|saga|historieta|c[oó]mic|manga|literari/i;

async function fromWikipedia(titulo: string, autor?: string): Promise<string | null> {
  for (const q of autor ? [`${titulo} ${autor}`, titulo] : [titulo]) {
    const search = await fetch(`https://es.wikipedia.org/w/rest.php/v1/search/page?${new URLSearchParams({ q, limit: '3' })}`);
    if (!search.ok) continue;
    const pages: { key: string; description?: string }[] = (await search.json()).pages ?? [];
    const page = pages.find((p) => p.description && BOOK_PAGE.test(p.description));
    if (!page) continue;
    const summary = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`);
    if (!summary.ok) continue;
    const extract: string | undefined = (await summary.json()).extract;
    if (extract) return extract;
  }
  return null;
}

type BookRef = { isbn?: string; titulo: string; autor?: string; descripcion?: string };
const synopsisCache = new Map<string, Promise<string | null>>();

/** Spanish synopsis for a book, or null when no source has one in Spanish. Cached per book. */
export const getBookSynopsis = (book: BookRef) => {
  const id = book.isbn || `${book.titulo}|${book.autor ?? ''}`;
  let pending = synopsisCache.get(id);
  if (!pending) {
    pending = (async () => {
      const storeKey = `synopsis_${id}`;
      const stored = await AsyncStorage.getItem(storeKey).catch(() => null);
      if (stored !== null) return stored || null; // '' = known to have none
      const fallback = book.descripcion && isSpanish(book.descripcion) ? book.descripcion : null;
      try {
        const openLibrary = await getOpenLibrarySynopsis(book);
        const wikipedia = openLibrary && isSpanish(openLibrary) ? null : await fromWikipedia(book.titulo, book.autor);
        const text = (openLibrary && isSpanish(openLibrary) ? openLibrary : wikipedia) || fallback;
        AsyncStorage.setItem(storeKey, text ?? '').catch(() => {});
        return text;
      } catch {
        synopsisCache.delete(id); // network failure: retry on the next visit, store nothing
        return fallback;
      }
    })();
    synopsisCache.set(id, pending);
  }
  return pending;
};

/** Everything the admin form can prefill from an ISBN. Null when Open Library has no edition. */
export type BookLookup = {
  titulo?: string;
  autor?: string;
  editorial?: string;
  anio?: string;
  synopsis: string | null;
  cover: string | null;
};

export const lookupBookByIsbn = async (isbn: string): Promise<BookLookup | null> => {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  if (!clean) return null;
  const edition = await searchOpenLibraryByISBN(clean);
  if (!edition) return null;
  const [synopsis, cover] = await Promise.all([
    getBookSynopsis({ isbn: clean, titulo: edition.title, autor: edition.author }),
    getOpenLibraryCoverUrl(clean),
  ]);
  return {
    titulo: edition.title,
    autor: edition.author,
    editorial: edition.publishers?.[0]?.name,
    anio: String(edition.publish_date ?? '').match(/\d{4}/)?.[0],
    synopsis,
    cover,
  };
};
