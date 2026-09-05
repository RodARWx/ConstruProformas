import { existsSync } from 'fs';
import { join } from 'path';
import ExcelJS from 'exceljs';

/** Primera fila de datos en productos.xlsx (columnas A–D). */
export const CATALOG_SEED_FIRST_DATA_ROW = 5;

export const DEFAULT_CATALOG_UNIT = 'u';
export const DEFAULT_CATALOG_UNIT_COST = 10;

export interface CatalogExcelProductRow {
  codigoSugerido: string;
  categoriaNombre: string;
  descripcion: string;
  ivaPercentage: number;
}

/**
 * Ruta al Excel de catálogo relativa al archivo compilado.
 * dist/src/database → ../../../seed-data/productos.xlsx → /app/seed-data/...
 */
export function resolveProductosExcelPath(): string {
  return join(__dirname, '..', '..', '..', 'seed-data', 'productos.xlsx');
}

function parseIva(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Porcentaje IVA inválido: ${String(value)}`);
  }
  if (parsed < 0 || parsed > 100) {
    throw new Error(`Porcentaje IVA fuera de rango (0-100): ${parsed}`);
  }
  return parsed;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return String((value as ExcelJS.CellFormulaValue).result ?? '');
  }
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    return (value as ExcelJS.CellRichTextValue).richText
      .map((part) => part.text)
      .join('');
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }
  return String(value);
}

export function sanitizeTextAccents(text: string): string {
  return text
    .replace(/À/g, 'Á')
    .replace(/È/g, 'É')
    .replace(/Ì/g, 'Í')
    .replace(/Ò/g, 'Ó')
    .replace(/Ù/g, 'Ú')
    .replace(/à/g, 'á')
    .replace(/è/g, 'é')
    .replace(/ì/g, 'í')
    .replace(/ò/g, 'ó')
    .replace(/ù/g, 'ú')
    .replace(/`/g, "'");
}

/** Lee rubros desde productos.xlsx a partir de la fila 5 (A=código, B=categoría, C=nombre, D=IVA). */
export async function readCatalogProductsFromExcel(
  filePath: string,
): Promise<CatalogExcelProductRow[]> {
  if (!existsSync(filePath)) {
    throw new Error(`Archivo de seed no encontrado: ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const products: CatalogExcelProductRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < CATALOG_SEED_FIRST_DATA_ROW) {
      return;
    }

    const codigoSugerido = cellText(row.getCell(1).value).trim().toUpperCase();
    const categoriaNombre = sanitizeTextAccents(cellText(row.getCell(2).value).trim());
    const descripcion = sanitizeTextAccents(cellText(row.getCell(3).value).trim());

    if (!codigoSugerido && !descripcion) {
      return;
    }

    if (!codigoSugerido || !categoriaNombre || !descripcion) {
      throw new Error(
        `Fila ${rowNumber} incompleta: código, categoría y nombre son obligatorios`,
      );
    }

    products.push({
      codigoSugerido,
      categoriaNombre,
      descripcion,
      ivaPercentage: parseIva(row.getCell(4).value),
    });
  });

  if (products.length === 0) {
    throw new Error('No se encontraron filas de productos en el Excel');
  }

  return products;
}
