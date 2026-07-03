/** Categoría por defecto para rubros sin clasificación (no eliminable). */
export const DEFAULT_CATEGORY_NAME = 'Otros rubros';

export const DEFAULT_CATEGORY_DESCRIPTION =
  'Rubros sin categoría asignada. Categoría protegida del sistema.';

export function isDefaultCategory(nombre: string): boolean {
  return nombre.trim() === DEFAULT_CATEGORY_NAME;
}
