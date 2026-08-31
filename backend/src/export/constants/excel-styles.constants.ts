import * as ExcelJS from 'exceljs';
import { BRAND_COLORS_ARGB, BRAND_FONTS, BRAND_FONT_SIZE } from './brand.constants';

const thinSide = {
  style: 'thin' as const,
  color: { argb: 'FF000000' },
};

export const excelThinBorder: Partial<ExcelJS.Borders> = {
  top: thinSide,
  left: thinSide,
  bottom: thinSide,
  right: thinSide,
};

export function fontBlack(size = BRAND_FONT_SIZE): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.black,
    size,
    bold: true,
    color: { argb: BRAND_COLORS_ARGB.charcoal },
  };
}

export function fontBook(size = BRAND_FONT_SIZE): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.book,
    size,
    color: { argb: BRAND_COLORS_ARGB.charcoal },
  };
}

export function fontBookSecondary(size = BRAND_FONT_SIZE): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.book,
    size,
    color: { argb: BRAND_COLORS_ARGB.secondaryText },
  };
}

export function fillSolid(argb: string): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  };
}

export function headerTableFont(): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.black,
    size: BRAND_FONT_SIZE,
    bold: true,
    color: { argb: BRAND_COLORS_ARGB.white },
  };
}

export function categoryRowFont(): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.black,
    size: BRAND_FONT_SIZE,
    bold: true,
    color: { argb: BRAND_COLORS_ARGB.burgundy },
  };
}

export function totalRedFont(size = BRAND_FONT_SIZE): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.black,
    size,
    bold: true,
    color: { argb: BRAND_COLORS_ARGB.primaryRed },
  };
}

export function fontBookRed(size = BRAND_FONT_SIZE): Partial<ExcelJS.Font> {
  return {
    name: BRAND_FONTS.book,
    size,
    bold: false,
    color: { argb: BRAND_COLORS_ARGB.primaryRed },
  };
}

export const MONEY_FORMAT = '$#,##0.00';
export const QTY_FORMAT = '#,##0.00';

/** Aplica un borde exterior en el contorno del rango (de minRow a maxRow, minCol a maxCol). */
export function applyOuterContourBorder(
  sheet: ExcelJS.Worksheet,
  minRow = 1,
  maxRow = 31,
  minCol = 1,
  maxCol = 7,
  borderStyle: ExcelJS.BorderStyle = 'medium',
): void {
  const side = { style: borderStyle, color: { argb: 'FF000000' } };

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = sheet.getRow(r).getCell(c);
      const b = cell.border || {};

      cell.border = {
        top: r === minRow ? side : b.top,
        bottom: r === maxRow ? side : b.bottom,
        left: c === minCol ? side : b.left,
        right: c === maxCol ? side : b.right,
      };
    }
  }
}
