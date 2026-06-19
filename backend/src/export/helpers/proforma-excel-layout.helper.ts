import * as ExcelJS from 'exceljs';
import { ProformaDetail } from '../../proformas/entities/proforma-detail.entity';

/** Hoja y filas ancla de la plantilla institucional v2 */
export const SHEET_NAME = 'PROFORMA';
export const CONTENT_START_ROW = 13;
export const DEFAULT_CONTENT_ROWS = 13;
export const BASE_TOTALS_ROW = 26;
export const BASE_NOTES_ROW = 31;
export const BASE_CONTACT_ROW = 42;
export const ITEM_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export type ExportRow =
  | { type: 'category'; label: string }
  | { type: 'item'; detail: ProformaDetail };

export interface CategoryRowTemplate {
  row: number;
  mergeRange: string;
  height?: number;
}

export interface LayoutPositions {
  totalsRow: number;
  notesRow: number;
  contactRow: number;
  lastContentRow: number;
}

/** Convierte detalles de proforma en filas de exportación ordenadas. */
export function buildExportRows(detalles: ProformaDetail[]): ExportRow[] {
  return detalles.map((detail) => {
    if (detail.esCategoria) {
      const label =
        detail.descripcion?.trim() || detail.codigo?.trim() || '';
      return { type: 'category', label };
    }

    return { type: 'item', detail };
  });
}

/** Detecta filas de categoría en la plantilla (merge A:G de una sola fila). */
export function detectCategoryRowTemplates(
  sheet: ExcelJS.Worksheet,
): CategoryRowTemplate[] {
  const templates: CategoryRowTemplate[] = [];

  for (const merge of sheet.model.merges ?? []) {
    const bounds = parseMergeRange(merge);
    if (!bounds) {
      continue;
    }

    const isCategoryMerge =
      bounds.startRow === bounds.endRow &&
      bounds.startCol === 1 &&
      bounds.endCol >= 7 &&
      bounds.startRow >= CONTENT_START_ROW &&
      bounds.startRow < BASE_TOTALS_ROW;

    if (!isCategoryMerge) {
      continue;
    }

    templates.push({
      row: bounds.startRow,
      mergeRange:
        bounds.endCol > 7
          ? `A${bounds.startRow}:G${bounds.startRow}`
          : merge,
      height: sheet.getRow(bounds.startRow).height,
    });
  }

  return templates.sort((left, right) => left.row - right.row);
}

export function getPrimaryCategoryTemplate(
  templates: CategoryRowTemplate[],
): CategoryRowTemplate {
  return (
    templates[0] ?? {
      row: CONTENT_START_ROW,
      mergeRange: `A${CONTENT_START_ROW}:G${CONTENT_START_ROW}`,
    }
  );
}

export function parseMergeRange(
  merge: string,
): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
} | null {
  const match = merge.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    startCol: columnLettersToNumber(match[1]),
    startRow: parseInt(match[2], 10),
    endCol: columnLettersToNumber(match[3]),
    endRow: parseInt(match[4], 10),
  };
}

export function columnLettersToNumber(letters: string): number {
  let value = 0;
  for (const character of letters) {
    value = value * 26 + (character.charCodeAt(0) - 64);
  }
  return value;
}

/** Construye fórmula SUM para filas dispersas (solo rubros, no categorías). */
export function buildSumFormula(column: string, rows: number[]): string {
  if (rows.length === 0) {
    return '0';
  }

  if (rows.length === 1) {
    return `${column}${rows[0]}`;
  }

  return `SUM(${rows.map((row) => `${column}${row}`).join(',')})`;
}

export function getItemRows(
  exportRows: ExportRow[],
  startRow: number,
): number[] {
  const rows: number[] = [];
  let currentRow = startRow;

  for (const exportRow of exportRows) {
    if (exportRow.type === 'item') {
      rows.push(currentRow);
    }
    currentRow += 1;
  }

  return rows;
}

export function calculateRowOffset(contentRowCount: number): number {
  if (contentRowCount > DEFAULT_CONTENT_ROWS) {
    return contentRowCount - DEFAULT_CONTENT_ROWS;
  }

  if (contentRowCount < DEFAULT_CONTENT_ROWS) {
    return -(DEFAULT_CONTENT_ROWS - contentRowCount);
  }

  return 0;
}

export function resolveLayoutPositions(rowOffset: number): LayoutPositions {
  const totalsRow = BASE_TOTALS_ROW + rowOffset;
  const notesRow = BASE_NOTES_ROW + rowOffset;
  const contactRow = BASE_CONTACT_ROW + rowOffset;

  return {
    totalsRow,
    notesRow,
    contactRow,
    lastContentRow: totalsRow - 1,
  };
}

export function parseTiempoDias(tiempo: string | null): number | string {
  if (!tiempo?.trim()) {
    return '';
  }

  const numeric = Number(tiempo.replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : tiempo;
}

export function sumTiempoDias(detalles: ProformaDetail[]): number {
  return detalles
    .filter((linea) => !linea.esCategoria)
    .reduce((sum, linea) => {
      const parsed = parseTiempoDias(linea.tiempo);
      return sum + (typeof parsed === 'number' ? parsed : 0);
    }, 0);
}

/** Ajusta ancho de columnas según contenido para evitar ### en Excel. */
export function autoFitColumns(
  sheet: ExcelJS.Worksheet,
  columns: readonly string[],
  startRow: number,
  endRow: number,
  minWidths: Record<string, number> = {},
): void {
  for (const columnLetter of columns) {
    const colIndex = columnLettersToNumber(columnLetter);
    let maxLength = minWidths[columnLetter] ?? 8;

    for (let row = startRow; row <= endRow; row++) {
      const value = sheet.getCell(`${columnLetter}${row}`).value;
      if (value == null) {
        continue;
      }

      const text =
        typeof value === 'object' && 'result' in value
          ? String(value.result ?? '')
          : String(value);

      maxLength = Math.max(maxLength, text.length + 2);
    }

    const column = sheet.getColumn(colIndex);
    column.width = Math.min(Math.max(maxLength, minWidths[columnLetter] ?? 8), 80);
  }
}
