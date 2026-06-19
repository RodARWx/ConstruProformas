import * as ExcelJS from 'exceljs';
import { BRAND_COLORS_ARGB, BRAND_FONTS, BRAND_FONT_SIZE } from './brand.constants';

const thinSide = {
  style: 'thin' as const,
  color: { argb: BRAND_COLORS_ARGB.softBorder },
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

export const MONEY_FORMAT = '$#,##0.00';
export const QTY_FORMAT = '#,##0.00';
