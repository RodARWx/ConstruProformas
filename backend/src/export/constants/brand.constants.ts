/**
 * Paleta oficial Construmétrica — Manual de Marca (COLORES CORPORATIVOS, pág. 9)
 *
 * | Color              | HEX      | RGB           | Uso en proforma              |
 * |--------------------|----------|---------------|------------------------------|
 * | Rojo primario      | #FF0033  | 255, 0, 51    | Total, acentos               |
 * | Coral              | #D07761  | 240, 119, 97  | Degradado / acento cálido    |
 * | Burdeos            | #550012  | 90, 0, 25     | Encabezados de tabla         |
 * | Gris carbón        | #444242  | 66, 66, 66    | Texto principal, bordes      |
 */
export const BRAND_COLORS = {
  primaryRed: '#FF0033',
  coral: '#D07761',
  maroon: '#550012',
  charcoal: '#444242',
  white: '#FFFFFF',
  /** Texto secundario — APLICACIÓN (pág. 15) */
  textSecondary: '#777777',
  /** Coral al 12 % — filas de categoría */
  categoryTint: '#FBECE8',
  /** Borde suave para celdas de datos */
  borderLight: '#CCCCCC',
} as const;

/** ARGB para ExcelJS (prefijo FF = opaco) */
export const BRAND_EXCEL = {
  primaryRed: 'FFFF0033',
  coral: 'FFD07761',
  maroon: 'FF550012',
  charcoal: 'FF444242',
  white: 'FFFFFFFF',
  textSecondary: 'FF777777',
  categoryTint: 'FFFBECE8',
  borderLight: 'FFCCCCCC',
} as const;

/** Bloque CSS `:root` para plantilla HTML/PDF */
export function buildBrandCssVariables(): string {
  return `:root {
  --brand-primary: ${BRAND_COLORS.primaryRed};
  --brand-coral: ${BRAND_COLORS.coral};
  --brand-maroon: ${BRAND_COLORS.maroon};
  --brand-charcoal: ${BRAND_COLORS.charcoal};
  --brand-white: ${BRAND_COLORS.white};
  --brand-text-secondary: ${BRAND_COLORS.textSecondary};
  --brand-category-tint: ${BRAND_COLORS.categoryTint};
  --brand-border: ${BRAND_COLORS.borderLight};
}`;
}

import { BRAND_FONT_FAMILY } from '../helpers/brand-fonts.helper';

/** Tipografía corporativa — Gotham (Manual pág. 14). */
export const BRAND_FONTS = {
  /** Títulos, encabezados de tabla, categorías */
  title: `"${BRAND_FONT_FAMILY.black}", "Arial Black", Arial, sans-serif`,
  /** Etiquetas de datos (negrita sobre Gotham Book) */
  label: `"${BRAND_FONT_FAMILY.book}", Arial, sans-serif`,
  /** Cuerpo y valores */
  body: `"${BRAND_FONT_FAMILY.book}", Arial, sans-serif`,
} as const;
