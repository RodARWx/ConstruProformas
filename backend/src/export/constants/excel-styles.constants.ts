import * as ExcelJS from 'exceljs';
import { BRAND_EXCEL } from './brand.constants';
import { BRAND_FONT_FAMILY } from '../helpers/brand-fonts.helper';

export const SHEET_NAME = 'PROFORMA';

export const COLUMN_WIDTHS: Record<string, number> = {
  A: 15.66,
  B: 78.89,
  C: 21.33,
  D: 22,
  E: 16,
  F: 15.44,
  G: 16.33,
};

/** Colores de exportación alineados al manual de marca */
export const COLORS = {
  headerFill: BRAND_EXCEL.maroon,
  headerText: BRAND_EXCEL.white,
  categoryFill: BRAND_EXCEL.categoryTint,
  categoryText: BRAND_EXCEL.maroon,
  totalAccent: BRAND_EXCEL.primaryRed,
  border: BRAND_EXCEL.borderLight,
  borderStrong: BRAND_EXCEL.charcoal,
  text: BRAND_EXCEL.charcoal,
  textSecondary: BRAND_EXCEL.textSecondary,
} as const;

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

/** Gotham Book — datos, valores, notas */
export const FONT_DATA: Partial<ExcelJS.Font> = {
  name: BRAND_FONT_FAMILY.book,
  size: 10,
  color: { argb: COLORS.text },
};

/** Gotham Book en negrita — etiquetas de campos y totales */
export const FONT_LABEL: Partial<ExcelJS.Font> = {
  ...FONT_DATA,
  bold: true,
};

/** Gotham Black — títulos, encabezados de tabla, categorías */
export const FONT_TITLE: Partial<ExcelJS.Font> = {
  name: BRAND_FONT_FAMILY.black,
  size: 10,
  bold: false,
  color: { argb: COLORS.text },
};

export const FONT_TITLE_LARGE: Partial<ExcelJS.Font> = {
  ...FONT_TITLE,
  size: 12,
};

export const FONT_TITLE_HEADER: Partial<ExcelJS.Font> = {
  ...FONT_TITLE,
  color: { argb: COLORS.headerText },
};

export const FONT_TITLE_CATEGORY: Partial<ExcelJS.Font> = {
  ...FONT_TITLE,
  color: { argb: COLORS.categoryText },
};

/** Alias retrocompatibles */
export const FONT_BASE = FONT_DATA;
export const FONT_BOLD = FONT_LABEL;
export const FONT_HEADER = FONT_TITLE_HEADER;
export const FONT_COMPANY = FONT_TITLE_LARGE;
export const FONT_CATEGORY = FONT_TITLE_CATEGORY;

export const MONEY_FORMAT = '$#,##0.00';
export const QTY_FORMAT = '#,##0.00';

export const CONTENT_START_ROW = 13;
export const GAP_AFTER_TOTALS = 2;
