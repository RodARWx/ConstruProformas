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
  fontBookRed,
  fontBookSecondary,
  MONEY_FORMAT,
  QTY_FORMAT,
  totalRedFont,
} from '../constants/excel-styles.constants';
import { formatCurrency, formatDate } from './filename.helper';
import { max } from 'class-validator';

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
  /** Fila donde termina el bloque Contacto */
  contactEndRow: number;
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
      for (let c = 1; c <= 7; c++) {
        const cell = sheet.getRow(currentRow).getCell(c);
        cell.border = excelThinBorder;
        cell.fill = fillSolid(BRAND_COLORS_ARGB.categoryTint);
      }
      const cell = sheet.getCell(`A${currentRow}`);
      cell.value = linea.descripcion;
      cell.font = categoryRowFont();
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
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
    contactEndRow: 0,
  };
}

/**
 * Bloque de totales con fórmulas Excel reales (SUM sobre filas de rubros).
 */
export function buildTotalsBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  layout: ProformaLayoutResult,
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
  sheet.getCell(`B${row}`).value = TOTALS_LABELS.totalDias;
  sheet.getCell(`B${row}`).font = fontBook();
  sheet.getCell(`B${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`C${row}`).value = { formula: diasFormula };
  sheet.getCell(`C${row}`).font = fontBook();
  sheet.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  row += 1;

  // SUBTOTAL
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = TOTALS_LABELS.subtotal;
  sheet.getCell(`A${row}`).font = fontBook();
  sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${row}`).value = { formula: subtotalFormula };
  sheet.getCell(`G${row}`).font = fontBook();
  sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
  sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
  const subtotalRow = row;
  row += 1;

  let ivaRow: number | null = null;
  if (proforma.iva > 0) {
    ivaRow = row;
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = TOTALS_LABELS.iva;
    sheet.getCell(`A${row}`).font = fontBook();
    sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getCell(`G${row}`).value = proforma.iva;
    sheet.getCell(`G${row}`).font = fontBook();
    sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
    sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
    row += 1;
  }

  // TOTAL (rojo institucional sin negrita)
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = TOTALS_LABELS.total;
  sheet.getCell(`A${row}`).font = fontBookRed();
  sheet.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };

  const totalFormula = ivaRow
    ? `G${subtotalRow}+G${ivaRow}`
    : `G${subtotalRow}`;

  sheet.getCell(`G${row}`).value = { formula: totalFormula };
  sheet.getCell(`G${row}`).font = fontBookRed();
  sheet.getCell(`G${row}`).numFmt = MONEY_FORMAT;
  sheet.getCell(`G${row}`).alignment = { horizontal: 'right' };

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

  return row + 6;
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

/**
  Rellena la plantilla Excel oficial descargada en backend/templates/plantilla-proforma.xlsx
 */
export function populateExcelTemplate(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
): ProformaLayoutResult {
  const maxRow = sheet.rowCount;
  for (let r = 13; r <= maxRow; r++) {
    try {
      sheet.unMergeCells(`A${r}:G${r}`);
    } catch { }
    sheet.getRow(r).values = [];
  }

  const rubroRows: number[] = [];
  let currentRow = 13;

  proforma.detalles.forEach((linea) => {
    const row = sheet.getRow(currentRow);
    if (linea.esCategoria) {
      sheet.mergeCells(`A${currentRow}:G${currentRow}`);
      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.border = excelThinBorder;
        cell.fill = fillSolid(BRAND_COLORS_ARGB.categoryTint);
      }
      const cell = row.getCell(1);
      cell.value = linea.descripcion;
      cell.font = categoryRowFont();
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      row.height = 24;
    } else {
      rubroRows.push(currentRow);
      row.getCell(1).value = linea.codigo ?? '';
      row.getCell(2).value = linea.descripcion;
      row.getCell(3).value = linea.diasLaborables;
      row.getCell(4).value = linea.unidad;
      row.getCell(5).value = linea.cantidad;
      row.getCell(6).value = linea.costoUnitario;
      row.getCell(7).value = { formula: `E${currentRow}*F${currentRow}` };

      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.border = excelThinBorder;
        cell.font = fontBook();
        if (c === 5) cell.numFmt = QTY_FORMAT;
        if (c === 6 || c === 7) cell.numFmt = MONEY_FORMAT;
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 || c === 3 || c === 4 ? 'center' : c >= 5 ? 'right' : 'left',
          wrapText: c === 2,
        };
      }
      const descripcion = String(linea.descripcion ?? '');

      const maxCharsPerLine = 50;
      const lineas = Math.ceil(descripcion.length / maxCharsPerLine);

      const maxRow = Math.max(15, lineas * 15);

      row.height = maxRow;
    }
    currentRow++;
  });

  const lastItemRow = currentRow - 1;

  // TOTAL EN DÍAS (sin combinar A:F; etiqueta en B a la derecha, valor en C centrado)
  const totalDiasRow = currentRow;
  sheet.getCell(`B${currentRow}`).value = TOTALS_LABELS.totalDias;
  sheet.getCell(`B${currentRow}`).font = fontBook();
  sheet.getCell(`B${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`C${currentRow}`).value = {
    formula: rubroRows.length > 0 ? `SUM(${rubroRows.map((r) => `C${r}`).join(',')})` : '0',
  };
  sheet.getCell(`C${currentRow}`).font = fontBook();
  sheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow++;

  const subtotalRow = currentRow;
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = TOTALS_LABELS.subtotal;
  sheet.getCell(`A${currentRow}`).font = fontBook();
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = {
    formula: rubroRows.length > 0 ? `SUM(${rubroRows.map((r) => `G${r}`).join(',')})` : '0',
  };
  sheet.getCell(`G${currentRow}`).font = fontBook();
  sheet.getCell(`G${currentRow}`).numFmt = MONEY_FORMAT;
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  currentRow++;

  let ivaRow: number | null = null;
  if (proforma.iva > 0) {
    ivaRow = currentRow;
    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = TOTALS_LABELS.iva;
    sheet.getCell(`A${currentRow}`).font = fontBook();
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.getCell(`G${currentRow}`).value = { formula: `0.15*G${subtotalRow}` };
    sheet.getCell(`G${currentRow}`).font = fontBook();
    sheet.getCell(`G${currentRow}`).numFmt = MONEY_FORMAT;
    sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    currentRow++;
  }

  const totalRow = currentRow;
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = TOTALS_LABELS.total;
  sheet.getCell(`A${currentRow}`).font = fontBookRed();
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = {
    formula: ivaRow ? `G${subtotalRow}+G${ivaRow}` : `G${subtotalRow}`,
  };
  sheet.getCell(`G${currentRow}`).font = fontBookRed();
  sheet.getCell(`G${currentRow}`).numFmt = MONEY_FORMAT;
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.getCell('C8').value = { formula: `+G${totalRow}` };
  sheet.getCell('C9').value = { formula: `C${totalDiasRow}&" "&"${proforma.tipoDias ?? 'Días Laborables'}"` };

  currentRow += 2;
  const notesStartRow = currentRow;

  sheet.mergeCells(`A${currentRow}:G${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = 'NOTAS:';
  sheet.getCell(`A${currentRow}`).font = fontBlack();
  currentRow++;

  const notes = buildUserNotesForExport(proforma.notas);
  notes.forEach((note) => {
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const cell = sheet.getCell(`A${currentRow}`);
    cell.value = note;
    cell.font = fontBookSecondary();
    cell.alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(currentRow).height = Math.max(18, Math.ceil(note.length / 90) * 14);
    currentRow++;
  });

  currentRow += 6;
  const contactStartRow = currentRow;

  sheet.mergeCells(`A${currentRow}:G${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = 'Contacto:';
  sheet.getCell(`A${currentRow}`).font = fontBlack();
  currentRow++;

  const { profile } = proforma;
  const lines = [
    profile.nombre,
    profile.cargo,
    profile.registroSenescyt ? `Registro SENESCYT: ${profile.registroSenescyt}` : null,
    profile.telefono ? `Tel: ${profile.telefono}` : null,
    profile.correo ?? null,
  ].filter(Boolean) as string[];

  lines.forEach((line) => {
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = line;
    sheet.getCell(`A${currentRow}`).font = fontBook();
    currentRow++;
  });

  return {
    firstItemRow: 13,
    lastItemRow,
    rubroRows,
    totalsStartRow: totalDiasRow,
    notesStartRow,
    contactStartRow,
    contactEndRow: currentRow,
  };
}
