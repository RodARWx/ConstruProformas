/** Manual de marca Construmétrica — colores institucionales (pág. 9) */
export const BRAND_COLORS = {
  primaryRed: '#FF0033',
  coral: '#D07761',
  burgundy: '#550012',
  charcoal: '#444242',
  secondaryText: '#777777',
  categoryTint: '#FBECE8',
  softBorder: '#CCCCCC',
  white: '#FFFFFF',
} as const;

/** ExcelJS usa colores ARGB sin # */
export const BRAND_COLORS_ARGB = {
  primaryRed: 'FFFF0033',
  coral: 'FFD07761',
  burgundy: 'FF550012',
  charcoal: 'FF444242',
  secondaryText: 'FF777777',
  categoryTint: 'FFFBECE8',
  softBorder: 'FFCCCCCC',
  white: 'FFFFFFFF',
} as const;

/** Tipografía institucional (pág. 14) */
export const BRAND_FONTS = {
  black: 'Gotham Black',
  book: 'Gotham Book',
  /** Fallback cuando las fuentes OTF no están instaladas */
  fallbackBlack: 'Arial Black',
  fallbackBook: 'Arial',
} as const;

export const EXCEL_SHEET_NAME = 'PROFORMA';

/** Filas fijas de la hoja PROFORMA (referencia: CM-PROF-1 - Ejemplo.xlsx). */
export const EXCEL_LAYOUT = {
  /** Fila vacía entre datos de empresa (RUC) y metadatos del cliente */
  spacerRow: 5,
  clientMetaStartRow: 6,
  tableHeaderRow1: 12,
  tableHeaderRow2: 13,
  itemsStartRow: 14,
  /** Posición del QR WhatsApp alineado al borde derecho de la tabla (col G) */
  profileQr: {
    tlCol: 6.05,
    sizePx: 90,
    /** Filas de alto aproximado del QR para alinear el borde inferior con el contacto */
    heightInRows: 4.6,
    /** Ajuste fino del borde inferior respecto a la última fila de contacto */
    bottomRowOffset: 0.92,
  },
} as const;

/** Tamaño de fuente institucional para exportaciones (Excel y PDF fallback). */
export const BRAND_FONT_SIZE = 12;

/** Configuración de página A4 para ExcelJS (paperSize 9 = A4). */
export const A4_PAGE_SETUP: {
  paperSize: number;
  orientation: 'portrait' | 'landscape';
  fitToPage: boolean;
  fitToWidth: number;
  fitToHeight: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    header: number;
    footer: number;
  };
} = {
  paperSize: 9,
  orientation: 'portrait',
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: {
    left: 0.5,
    right: 0.5,
    top: 0.6,
    bottom: 0.6,
    header: 0.3,
    footer: 0.3,
  },
};
