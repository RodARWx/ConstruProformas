/** Rubro del catálogo tal como lo devuelve el backend. */
export interface CatalogItem {
  id: number
  codigoSugerido: string | null
  descripcion: string
  unidad: string
  costoUnitario: number
  categoriaNombre?: string | null
  diasLaborables?: number
  ivaPercentage?: number
}

export interface CreateCatalogItemPayload {
  codigoSugerido?: string
  descripcion: string
  unidad: string
  costoUnitario: number
  categoriaNombre?: string
  diasLaborables?: number
  ivaPercentage?: number
}

export type UpdateCatalogItemPayload = Partial<CreateCatalogItemPayload>

/** Datos listos para insertar como línea de rubro en una proforma (fase 6). */
export interface RubroLineInsert {
  codigo: string
  descripcion: string
  unidad: string
  costoUnitario: number
  categoriaNombre: string | null
  diasLaborables: number
  ivaPercentage: number
}

export function catalogItemToLineInsert(item: CatalogItem): RubroLineInsert {
  return {
    codigo: item.codigoSugerido ?? '',
    descripcion: item.descripcion,
    unidad: item.unidad,
    costoUnitario: item.costoUnitario,
    categoriaNombre: item.categoriaNombre ?? null,
    diasLaborables: item.diasLaborables ?? 1,
    ivaPercentage: item.ivaPercentage ?? 15,
  }
}
