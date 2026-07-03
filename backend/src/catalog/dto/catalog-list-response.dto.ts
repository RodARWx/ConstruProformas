import { ItemCatalog } from '../entities/item-catalog.entity';

/** Respuesta paginada del listado de rubros del catálogo. */
export interface CatalogListResponseDto {
  items: ItemCatalog[];
  total: number;
  page: number;
  pageSize: number | null;
}
