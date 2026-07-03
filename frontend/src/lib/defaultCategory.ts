export const DEFAULT_CATEGORY_NAME = 'Otros rubros'

export function isDefaultCategory(nombre: string): boolean {
  return nombre.trim() === DEFAULT_CATEGORY_NAME
}
