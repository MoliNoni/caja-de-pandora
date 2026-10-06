import React from 'react';
import { CatalogScreen } from '../../components/catalog-screen';

export default function VinylCatalogScreen() {
  return (
    <CatalogScreen
      category="vinyl"
      title="Catálogo de Vinilos"
      searchPlaceholder="Buscar vinilos por titulo, artista o genero"
      emptyTitle="No se encontraron vinilos"
      emptySubtitle="Intenta con otra busqueda"
    />
  );
}
