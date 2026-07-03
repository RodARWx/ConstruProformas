import { apiGet, apiDelete, apiPatch, apiPost } from '../../lib/api'
import type {
  CatalogItem,
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
} from '../../types/catalog'

export type CatalogSortBy = 'codigo' | 'descripcion' | 'costo'
export type CatalogSortOrder = 'asc' | 'desc'

export interface CatalogListParams {
  categoriaNombre?: string
  sortBy?: CatalogSortBy
  sortOrder?: CatalogSortOrder
  page?: number
  /** 0 = todos */
  limit?: number
}

export interface CatalogListResponse {
  items: CatalogItem[]
  total: number
  page: number
  pageSize: number | null
}

export async function fetchCatalogItems(
  params: CatalogListParams = {},
): Promise<CatalogListResponse> {
  return apiGet<CatalogListResponse>('/catalog', { params })
}

export async function searchCatalogItems(
  q: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<CatalogItem[]> {
  return apiGet<CatalogItem[]>('/catalog/search', {
    params: { q, limit },
    signal,
  })
}

export async function createCatalogItem(
  payload: CreateCatalogItemPayload,
): Promise<CatalogItem> {
  return apiPost<CatalogItem>('/catalog', payload)
}

export async function updateCatalogItem(
  id: number,
  payload: UpdateCatalogItemPayload,
): Promise<CatalogItem> {
  return apiPatch<CatalogItem>(`/catalog/${id}`, payload)
}

export async function deleteCatalogItem(id: number): Promise<void> {
  return apiDelete<void>(`/catalog/${id}`)
}
