import React from 'react';
import { CatalogScreen } from '../../components/catalog-screen';

export default function BooksCatalogScreen() {
  return (
    <CatalogScreen
      category="book"
      title="Catálogo de Libros"
      searchPlaceholder="Buscar libros por titulo, autor o genero"
      emptyTitle="No se encontraron libros"
      emptySubtitle="Intenta con otra busqueda"
    />
  );
}
