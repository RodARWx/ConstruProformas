import * as ExcelJS from 'exceljs';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ProformaDetail } from '../../proformas/entities/proforma-detail.entity';
import { BRAND_COLORS_ARGB } from '../constants/brand.constants';
import {
  TOTALS_LABELS,
} from '../constants/institutional.constants';
import { buildUserNotesForExport } from '../../proformas/helpers/proforma-notes.helper';
import {
  categoryRowFont,
  excelThinBorder,
  fillSolid,
  fontBlack,
  fontBook,
  fontBookSecondary,
  MONEY_FORMAT,
  QTY_FORMAT,
  totalRedFont,
} from '../constants/excel-styles.constants';
import { formatCurrency, formatDate } from './filename.helper';

export interface ProformaLayoutResult {
  /** Primera fila de rubros (dinámica) */
  firstItemRow: number;
  /** Última fila de rubros/categorías */
  lastItemRow: number;
  /** Filas de rubros (no categorías) para fórmulas SUM */
  rubroRows: number[];
  /** Fila donde inicia el bloque de totales */
  totalsStartRow: number;
  /** Fila donde inicia NOTAS */
  notesStartRow: number;
  /** Fila donde inicia bloque Contacto */
  contactStartRow: number;
}

/**
 * Escribe filas dinámicas de categorías y rubros desde la fila de inicio configurada.
 * Las categorías ocupan merge A:G; los rubros usan fórmula =E*F en columna G.
 */
export function buildDynamicItemRows(
  sheet: ExcelJS.Worksheet,
  detalles: ProformaDetail[],
  startRow = 13,
): ProformaLayoutResult {
  const rubroRows: number[] = [];
  let currentRow = startRow;

  detalles.forEach((linea) => {
    if (linea.esCategoria) {
      sheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const cell = sheet.getCell(`A${currentRow}`);
      cell.value = linea.descripcion;
      cell.font = categoryRowFont();
      cell.fill = fillSolid(BRAND_COLORS_ARGB.categoryTint);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = excelThinBorder;
      sheet.getRow(currentRow).height = 24;
    } else {
      rubroRows.push(currentRow);
      const row = sheet.getRow(currentRow);

      row.getCell(1).value = linea.codigo ?? '';
      row.getCell(2).value = linea.descripcion;
      row.getCell(3).value = linea.diasLaborables;
      row.getCell(4).value = linea.unidad;
      row.getCell(5).value = linea.cantidad;
      row.getCell(6).value = linea.costoUnitario;
      row.getCell(7).value = { formula: `E${currentRow}*F${currentRow}` };

      [1, 2, 3, 4].forEach((col) => {
        const cell = row.getCell(col);
        cell.font = fontBook();
        cell.border = excelThinBorder;
        cell.alignment = { vertical: 'middle', wrapText: col === 2 };
      });

      row.getCell(5).font = fontBook();
      row.getCell(5).numFmt = QTY_FORMAT;
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(5).border = excelThinBorder;

      row.getCell(6).font = fontBook();
      row.getCell(6).numFmt = MONEY_FORMAT;
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).border = excelThinBorder;

      row.getCell(7).font = fontBook();
      row.getCell(7).numFmt = MONEY_FORMAT;
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).border = excelThinBorder;

      row.height = 22;
    }

    currentRow += 1;
  });

  const lastItemRow = currentRow - 1;
  const totalsStartRow = currentRow + 1;

  return {
    firstItemRow: startRow,
    lastItemRow: detalles.length > 0 ? lastItemRow : startRow - 1,
    rubroRows,
    totalsStartRow,
    notesStartRow: 0,
    contactStartRow: 0,
  };
}

/**
 * Bloque de totales con fórmulas Excel reales (SUM sobre filas de rubros).
 */
export function buildTotalsBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  layout: ProformaLayoutResult,
  descuentoTotal: number = 0,        // <-- NUEVO
  descuentoPorcentaje: number = 0,   // <-- NUEVO
): number {
  let row = layout.totalsStartRow;
  const { rubroRows } = layout;

  const diasFormula =
    rubroRows.length > 0
      ? `SUM(${rubroRows.map((r) => `C${r}`).join(',')})`
      : '0';

  const subtotalFormula =
    rubroRows.length > 0
      ? `SUM(${rubroRows.map((r) => `G${r}`).join(',')})`
      : '0';

  // TOTAL EN DÍAS
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = TOTALS_LABELS.totalDias;
  sheet.getCell(`A${row}`).font = fontBlack();
  sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${row}`).value = { formula: diasFormula };
  sheet.getCell(`G${row}`).font = fontBook();
  sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
  sheet.getCell(`G${row}`).border = excelThinBorder;
  row += 1;

  // SUBTOTAL
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = TOTALS_LABELS.subtotal;
  sheet.getCell(`A${row}`).font = fontBlack();
  sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${row}`).value = { formula: subtotalFormula };
  sheet.getCell(`G${row}`).font = fontBook();
  sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
  sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
  sheet.getCell(`G${row}`).border = excelThinBorder;
  const subtotalRow = row;
  row += 1;

  // --- DESCUENTO (si existe) ---
  let descuentoRow: number | null = null;
  let subtotalConDescuentoRow: number | null = null; // ✅ declarada aquí

  if (descuentoTotal > 0) {
    descuentoRow = row;
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = `DESCUENTO (${descuentoPorcentaje.toFixed(2)}%)`;
    sheet.getCell(`A${row}`).font = fontBlack();
    sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getCell(`G${row}`).value = -descuentoTotal;
    sheet.getCell(`G${row}`).font = fontBook();
    sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
    sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
    sheet.getCell(`G${row}`).border = excelThinBorder;
    row += 1;

    // SUBTOTAL CON DESCUENTO
    subtotalConDescuentoRow = row;
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = 'SUBTOTAL CON DESCUENTO';
    sheet.getCell(`A${row}`).font = fontBlack();
    sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    const subtotalConDescuentoFormula = `G${subtotalRow}+G${descuentoRow}`;
    sheet.getCell(`G${row}`).value = { formula: subtotalConDescuentoFormula };
    sheet.getCell(`G${row}`).font = fontBook();
    sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
    sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
    sheet.getCell(`G${row}`).border = excelThinBorder;
    row += 1;
  }

  let ivaRow: number | null = null;
  if (proforma.iva > 0) {
    ivaRow = row;
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = TOTALS_LABELS.iva;
    sheet.getCell(`A${row}`).font = fontBlack();
    sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getCell(`G${row}`).value = proforma.iva;
    sheet.getCell(`G${row}`).font = fontBook();
    sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
    sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
    sheet.getCell(`G${row}`).border = excelThinBorder;
    row += 1;
  }

  // TOTAL (rojo institucional)
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = TOTALS_LABELS.total;
  sheet.getCell(`A${row}`).font = totalRedFont();
  sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };

  // Determinar la base para el total
  let totalBaseRow: number;
  if (subtotalConDescuentoRow !== null) {
    totalBaseRow = subtotalConDescuentoRow;
  } else {
    totalBaseRow = subtotalRow;
  }

  const totalFormula = ivaRow
    ? `G${totalBaseRow}+G${ivaRow}`
    : `G${totalBaseRow}`;

  sheet.getCell(`G${row}`).value = { formula: totalFormula };
  sheet.getCell(`G${row}`).font = totalRedFont();
  sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
  sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
  sheet.getCell(`G${row}`).border = excelThinBorder;

  return row + 2;
}

/**
 * Notas institucionales + notas del usuario. Cada nota en merge A:G.
 */
export function buildNotesBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  startRow: number,
): number {
  let row = startRow;

  sheet.mergeCells(`A${row}:G${row}`);
  sheet.getCell(`A${row}`).value = 'NOTAS:';
  sheet.getCell(`A${row}`).font = fontBlack();
  sheet.getCell(`A${row}`).alignment = { vertical: 'middle' };
  row += 1;

  const allNotes = buildUserNotesForExport(proforma.notas);

  allNotes.forEach((note) => {
    sheet.mergeCells(`A${row}:G${row}`);
    const cell = sheet.getCell(`A${row}`);
    cell.value = note;
    cell.font = fontBookSecondary();
    cell.alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(row).height = Math.max(18, Math.ceil(note.length / 90) * 14);
    row += 1;
  });

  return row + 1;
}

/**
 * Bloque de contacto del perfil emisor.
 */
export function buildContactBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  startRow: number,
): number {
  let row = startRow;
  const { profile } = proforma;

  sheet.mergeCells(`A${row}:G${row}`);
  sheet.getCell(`A${row}`).value = 'Contacto:';
  sheet.getCell(`A${row}`).font = fontBlack();
  row += 1;

  const lines = [
    profile.nombre,
    profile.cargo,
    profile.registroSenescyt ? `Registro SENESCYT: ${profile.registroSenescyt}` : null,
    profile.telefono ? `Tel: ${profile.telefono}` : null,
    profile.correo ?? null,
  ].filter(Boolean) as string[];

  lines.forEach((line) => {
    sheet.mergeCells(`A${row}:G${row}`);
    sheet.getCell(`A${row}`).value = line;
    sheet.getCell(`A${row}`).font = fontBook();
    row += 1;
  });

  return row;
}

/** Utilidad para plantilla HTML (fallback PDF) */
export function formatProformaForHtml(proforma: Proforma) {
  return {
    idProforma: proforma.idProforma,
    nombreProyecto: proforma.nombreProyecto,
    fecha: formatDate(proforma.fecha),
    tiempoEjecucion: proforma.tiempoEjecucion ?? '0',
    montoContrato: formatCurrency(proforma.montoContrato),
    subtotal: formatCurrency(proforma.subtotal),
    iva: formatCurrency(proforma.iva),
    totalGeneral: formatCurrency(proforma.totalGeneral),
    customer: proforma.customer,
    profile: proforma.profile,
    detalles: proforma.detalles,
    notas: proforma.notas,
    showIva: proforma.iva > 0,
  };
}
