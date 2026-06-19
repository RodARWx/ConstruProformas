/** Rubro del catálogo asociado a una categoría (GET /categories). */
export interface CategoryRubro {
  id: number
  codigoSugerido: string | null
  descripcion: string
  unidad: string
  costoUnitario: number
  diasLaborables?: number
  ivaPercentage?: number
  categoriaNombre?: string | null
}

export interface Category {
  nombre: string
  descripcion: string | null
  rubros: CategoryRubro[]
}

export interface CreateCategoryPayload {
  nombre: string
  descripcion?: string
}

export interface UpdateCategoryPayload {
  descripcion?: string | null
}
