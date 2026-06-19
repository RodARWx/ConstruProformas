import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api'
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../../types/category'

export async function fetchCategories(): Promise<Category[]> {
  return apiGet<Category[]>('/categories')
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  return apiPost<Category>('/categories', payload)
}

export async function updateCategory(
  nombre: string,
  payload: UpdateCategoryPayload,
): Promise<Category> {
  return apiPatch<Category>(
    `/categories/${encodeURIComponent(nombre)}`,
    payload,
  )
}

export async function deleteCategory(nombre: string): Promise<void> {
  return apiDelete<void>(`/categories/${encodeURIComponent(nombre)}`)
}
