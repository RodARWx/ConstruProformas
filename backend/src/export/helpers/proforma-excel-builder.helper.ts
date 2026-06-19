import * as ExcelJS from 'exceljs';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ProformaDetail } from '../../proformas/entities/proforma-detail.entity';
import {
  CLIENT_FIELD_LABELS,
  INSTITUTIONAL,
  INSTITUTIONAL_NOTES,
} from '../constants/institutional.constants';
import {
  COLORS,
  COLUMN_WIDTHS,
  CONTENT_START_ROW,
  FONT_BASE,
  FONT_BOLD,
  FONT_CATEGORY,
  FONT_COMPANY,
  FONT_HEADER,
  FONT_TITLE,
  GAP_AFTER_TOTALS,
  MONEY_FORMAT,
  QTY_FORMAT,
  SHEET_NAME,
  THIN_BORDER,
} from '../constants/excel-styles.constants';
import {
  buildExportRows,
  buildSumFormula,
  ExportRow,
  getItemRows,
  parseTiempoDias,
  sumTiempoDias,
} from './proforma-excel-layout.helper';

export interface ProformaWorkbookResult {
  workbook: ExcelJS.Workbook;
  sheet: ExcelJS.Worksheet;
  totalsRow: number;
  contactRow: number;
  lastRow: number;
}

function styleCell(
  cell: ExcelJS.Cell,
  options: {
    font?: Partial<ExcelJS.Font>;
    alignment?: Partial<ExcelJS.Alignment>;
    fill?: ExcelJS.Fill;
    border?: Partial<ExcelJS.Borders>;
    numFmt?: string;
  } = {},
): ExcelJS.Cell {
  if (options.font) cell.font = options.font as ExcelJS.Font;
  if (options.alignment) cell.alignment = options.alignment as ExcelJS.Alignment;
  if (options.fill) cell.fill = options.fill;
  if (options.border) cell.border = options.border as ExcelJS.Borders;
  if (options.numFmt) cell.numFmt = options.numFmt;
  return cell;
}

function mergeAndStyle(
  sheet: ExcelJS.Worksheet,
  range: string,
  value: ExcelJS.CellValue,
  options: Parameters<typeof styleCell>[1] = {},
): ExcelJS.Cell {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]);
  cell.value = value;
  return styleCell(cell, options);
}

function applyTableBorders(
  sheet: ExcelJS.Worksheet,
  row: number,
  fromCol = 1,
  toCol = 7,
): void {
  for (let col = fromCol; col <= toCol; col++) {
    styleCell(sheet.getCell(row, col), { border: THIN_BORDER });
  }
}

function drawFixedHeader(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
  sheet.getRow(1).height = 36.75;
  sheet.getRow(2).height = 32.25;
  sheet.getRow(3).height = 24;
  sheet.getRow(5).height = 30.75;

  styleCell(sheet.getCell('A1'), {
    font: FONT_CATEGORY,
    alignment: { vertical: 'middle' },
  }).value = CLIENT_FIELD_LABELS.project;

  mergeAndStyle(
    sheet,
    'B1:E1',
    `${proforma.idProforma}-${proforma.nombreProyecto}`,
    {
      font: FONT_CATEGORY,
      alignment: { vertical: 'middle', wrapText: true },
    },
  );

  mergeAndStyle(sheet, 'A2:G2', INSTITUTIONAL.companyName, {
    font: FONT_COMPANY,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  mergeAndStyle(
    sheet,
    'A3:C3',
    `${INSTITUTIONAL.addressLabel} ${INSTITUTIONAL.address}`,
    { font: FONT_BASE, alignment: { vertical: 'middle', wrapText: true } },
  );

  mergeAndStyle(
    sheet,
    'D3:G3',
    `${INSTITUTIONAL.rucLabel} ${INSTITUTIONAL.ruc}`,
    {
      font: FONT_BASE,
      alignment: { horizontal: 'right', vertical: 'middle' },
    },
  );

  const clientFields: [string, string | Date][] = [
    [CLIENT_FIELD_LABELS.client, proforma.customer.nombreCliente],
    [CLIENT_FIELD_LABELS.ruc, proforma.customer.rucCedula],
    [CLIENT_FIELD_LABELS.contractAmount, ''],
    [CLIENT_FIELD_LABELS.executionTime, ''],
    [CLIENT_FIELD_LABELS.date, new Date(proforma.fecha)],
  ];

  clientFields.forEach(([label, _value], index) => {
    const row = 5 + index;
    sheet.getRow(row).height = index === 0 ? 30.75 : 15.6;
    styleCell(sheet.getCell(`A${row}`), {
      font: FONT_BOLD,
      alignment: { vertical: 'middle' },
    }).value = label;
  });

  styleCell(sheet.getCell('D5'), {
    font: FONT_BASE,
    alignment: { vertical: 'middle' },
  }).value = proforma.customer.nombreCliente;

  styleCell(sheet.getCell('D6'), {
    font: FONT_BASE,
    alignment: { vertical: 'middle' },
  }).value = proforma.customer.rucCedula;

  styleCell(sheet.getCell('D9'), {
    font: FONT_BASE,
    alignment: { vertical: 'middle' },
  }).value = new Date(proforma.fecha);
  sheet.getCell('D9').numFmt = 'dd/mm/yyyy';
}

function drawTableHeader(sheet: ExcelJS.Worksheet): void {
  sheet.getRow(11).height = 18;
  sheet.getRow(12).height = 31.5;

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerFill },
  };

  const headerAlign: Partial<ExcelJS.Alignment> = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  };

  mergeAndStyle(sheet, 'A11:A12', 'CÓDIGO', {
    font: FONT_HEADER,
    fill: headerFill,
    alignment: headerAlign,
    border: THIN_BORDER,
  });

  mergeAndStyle(sheet, 'B11:B12', 'D  E  S  C  R  I  P  C  I  Ó  N', {
    font: FONT_HEADER,
    fill: headerFill,
    alignment: headerAlign,
    border: THIN_BORDER,
  });

  styleCell(sheet.getCell('C11'), {
    font: FONT_HEADER,
    fill: headerFill,
    alignment: headerAlign,
    border: THIN_BORDER,
  }).value = 'TIEMPO';

  styleCell(sheet.getCell('C12'), {
    font: FONT_HEADER,
    fill: headerFill,
    alignment: headerAlign,
    border: THIN_BORDER,
  }).value = 'DÍAS LABORABLES';

  mergeAndStyle(sheet, 'D11:D12', 'UNIDAD', {
    font: FONT_HEADER,
    fill: headerFill,
    alignment: headerAlign,
    border: THIN_BORDER,
  });

  mergeAndStyle(sheet, 'E11:G11', 'C  O  N  T  R  A  T  A D O', {
    font: FONT_HEADER,
    fill: headerFill,
    alignment: headerAlign,
    border: THIN_BORDER,
  });

  const subHeaders: [string, string][] = [
    ['E12', 'CANTIDAD'],
    ['F12', 'C. UNIR.'],
    ['G12', 'TOTAL'],
  ];

  subHeaders.forEach(([addr, label]) => {
    styleCell(sheet.getCell(addr), {
      font: FONT_HEADER,
      fill: headerFill,
      alignment: headerAlign,
      border: THIN_BORDER,
    }).value = label;
  });
}

function drawCategoryRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
): void {
  sheet.getRow(row).height = 18;
  const fill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.categoryFill },
  };

  mergeAndStyle(sheet, `A${row}:G${row}`, label, {
    font: FONT_CATEGORY,
    fill,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: THIN_BORDER,
  });
}

function drawItemRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  linea: ProformaDetail,
): void {
  sheet.getRow(row).height = 15;

  const values: [string, ExcelJS.CellValue][] = [
    ['A', linea.codigo ?? ''],
    ['B', linea.descripcion],
    ['C', parseTiempoDias(linea.tiempo)],
    ['D', linea.unidad],
    ['E', linea.cantidad],
    ['F', linea.costoUnitario],
    ['G', { formula: `E${row}*F${row}`, result: linea.total }],
  ];

  values.forEach(([col, value]) => {
    const cell = styleCell(sheet.getCell(`${col}${row}`), {
      font: FONT_BASE,
      border: THIN_BORDER,
      alignment: {
        vertical: 'middle',
        horizontal: ['E', 'F', 'G'].includes(col) ? 'right' : 'left',
        wrapText: col === 'B',
      },
    });
    cell.value = value;

    if (col === 'E') cell.numFmt = QTY_FORMAT;
    if (col === 'F' || col === 'G') cell.numFmt = MONEY_FORMAT;
  });
}

function drawDynamicContent(
  sheet: ExcelJS.Worksheet,
  exportRows: ExportRow[],
): { lastContentRow: number; itemRows: number[] } {
  let currentRow = CONTENT_START_ROW;
  const itemRows: number[] = [];

  for (const exportRow of exportRows) {
    if (exportRow.type === 'category') {
      drawCategoryRow(sheet, currentRow, exportRow.label);
    } else {
      drawItemRow(sheet, currentRow, exportRow.detail);
      itemRows.push(currentRow);
    }
    currentRow += 1;
  }

  return { lastContentRow: currentRow - 1, itemRows };
}

function drawTotalsBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  totalsRow: number,
  itemRows: number[],
  ivaRate: number,
): number {
  const totalDias = sumTiempoDias(proforma.detalles);
  const ivaRow = totalsRow + 1;
  const totalRow = totalsRow + 2;

  sheet.getRow(totalsRow).height = 15;
  sheet.getRow(ivaRow).height = 15;
  sheet.getRow(totalRow).height = 15;

  styleCell(sheet.getCell(`B${totalsRow}`), {
    font: FONT_BOLD,
    alignment: { horizontal: 'right', vertical: 'middle' },
  }).value = 'TOTAL EN DÍAS:';

  styleCell(sheet.getCell(`C${totalsRow}`), {
    font: FONT_BASE,
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: THIN_BORDER,
  }).value = {
    formula: buildSumFormula('C', itemRows),
    result: totalDias,
  };

  styleCell(sheet.getCell(`F${totalsRow}`), {
    font: FONT_BOLD,
    alignment: { horizontal: 'right', vertical: 'middle' },
  }).value = 'SUBTOTAL:';

  styleCell(sheet.getCell(`G${totalsRow}`), {
    font: FONT_BASE,
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: THIN_BORDER,
    numFmt: MONEY_FORMAT,
  }).value = {
    formula: buildSumFormula('G', itemRows),
    result: proforma.subtotal,
  };

  if (proforma.appliesIva) {
    styleCell(sheet.getCell(`F${ivaRow}`), {
      font: FONT_BOLD,
      alignment: { horizontal: 'right', vertical: 'middle' },
    }).value = `IVA(${Math.round(ivaRate * 100)}%):`;

    styleCell(sheet.getCell(`G${ivaRow}`), {
      font: FONT_BASE,
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: THIN_BORDER,
      numFmt: MONEY_FORMAT,
    }).value = {
      formula: `${ivaRate}*G${totalsRow}`,
      result: proforma.iva,
    };
  } else {
    styleCell(sheet.getCell(`F${ivaRow}`), { font: FONT_BOLD }).value =
      'IVA(0%):';
    styleCell(sheet.getCell(`G${ivaRow}`), { numFmt: MONEY_FORMAT }).value = 0;
  }

  styleCell(sheet.getCell(`F${totalRow}`), {
    font: { ...FONT_BOLD, color: { argb: COLORS.totalAccent } },
    alignment: { horizontal: 'right', vertical: 'middle' },
  }).value = 'TOTAL:';

  styleCell(sheet.getCell(`G${totalRow}`), {
    font: { ...FONT_BOLD, color: { argb: COLORS.totalAccent } },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: THIN_BORDER,
    numFmt: MONEY_FORMAT,
  }).value = {
    formula: `G${ivaRow}+G${totalsRow}`,
    result: proforma.totalGeneral,
  };

  const tiempoLabel =
    proforma.tiempoEjecucion?.trim() || `${totalDias} dias`;

  styleCell(sheet.getCell('D7'), {
    font: FONT_BASE,
    alignment: { vertical: 'middle' },
  }).value = {
    formula: `"$"&G${totalRow}&""`,
    result: `$${proforma.totalGeneral.toFixed(2)}`,
  };

  styleCell(sheet.getCell('D8'), {
    font: FONT_BASE,
    alignment: { vertical: 'middle' },
  }).value = {
    formula: `C${totalsRow}&" dias"`,
    result: tiempoLabel,
  };

  applyTableBorders(sheet, totalsRow);
  applyTableBorders(sheet, ivaRow);
  applyTableBorders(sheet, totalRow);

  return totalRow;
}

function drawNotesBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  notesTitleRow: number,
): number {
  styleCell(sheet.getCell(`A${notesTitleRow}`), {
    font: FONT_CATEGORY,
    alignment: { vertical: 'middle' },
  }).value = 'NOTAS:';

  const notes = proforma.notas?.trim()
    ? proforma.notas
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => (line.startsWith('*') ? line : `*${line}`))
    : INSTITUTIONAL_NOTES.map((line) => `*${line}`);

  let currentRow = notesTitleRow + 1;

  notes.forEach((text) => {
    sheet.getRow(currentRow).height = text.length > 80 ? 30 : 15;
    mergeAndStyle(sheet, `A${currentRow}:G${currentRow}`, text, {
      font: { ...FONT_BASE, color: { argb: COLORS.textSecondary } },
      alignment: { vertical: 'top', wrapText: true },
    });
    currentRow += 1;
  });

  return currentRow - 1;
}

function drawContactBlock(
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  contactRow: number,
): number {
  const { profile } = proforma;

  styleCell(sheet.getCell(`A${contactRow}`), {
    font: FONT_TITLE,
    alignment: { vertical: 'middle' },
  }).value = 'Contacto:';

  const lines = [
    profile.nombre,
    profile.cargo,
    `Reg. SENESCYT No. ${profile.registroSenescyt ?? '—'}`,
    `Teléf.: ${profile.telefono ?? '—'}`,
    `Correo: ${profile.correo ?? '—'}`,
  ];

  lines.forEach((line, index) => {
    const row = contactRow + index;
    sheet.getRow(row).height = 15;
    styleCell(sheet.getCell(`B${row}`), {
      font: FONT_BASE,
      alignment: { vertical: 'middle', wrapText: true },
    }).value = line;
  });

  return contactRow + lines.length - 1;
}

function applyColumnWidths(sheet: ExcelJS.Worksheet): void {
  Object.entries(COLUMN_WIDTHS).forEach(([col, width]) => {
    sheet.getColumn(col).width = width;
  });
}

function autoFitDescriptionColumn(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
): void {
  let maxLen = COLUMN_WIDTHS.B;

  for (let row = startRow; row <= endRow; row++) {
    const value = sheet.getCell(`B${row}`).value;
    if (value != null) {
      maxLen = Math.max(maxLen, String(value).length * 0.9);
    }
  }

  sheet.getColumn('B').width = Math.min(Math.max(maxLen, 40), 90);
}

/** Construye el workbook Excel completo desde cero, sin mutar plantilla. */
export function buildProformaWorkbook(
  proforma: Proforma,
  ivaRate: number,
): ProformaWorkbookResult {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = INSTITUTIONAL.companyName;
  const sheet = workbook.addWorksheet(SHEET_NAME, {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  applyColumnWidths(sheet);
  drawFixedHeader(sheet, proforma);
  drawTableHeader(sheet);

  const exportRows = buildExportRows(proforma.detalles);
  const { lastContentRow, itemRows } = drawDynamicContent(sheet, exportRows);

  const totalsRow = lastContentRow + 1;
  const totalRowEnd = drawTotalsBlock(
    sheet,
    proforma,
    totalsRow,
    itemRows,
    ivaRate,
  );

  const notesTitleRow = totalRowEnd + 1 + GAP_AFTER_TOTALS;
  const notesEndRow = drawNotesBlock(sheet, proforma, notesTitleRow);

  const contactRow = notesEndRow + 2;
  const lastRow = drawContactBlock(sheet, proforma, contactRow);

  autoFitDescriptionColumn(sheet, CONTENT_START_ROW, lastContentRow);

  sheet.pageSetup.printArea = `A1:G${lastRow + 1}`;

  return {
    workbook,
    sheet,
    totalsRow,
    contactRow,
    lastRow,
  };
}

/** Filas de rubro (para tests o validación externa) */
export function resolveItemRows(exportRows: ExportRow[]): number[] {
  return getItemRows(exportRows, CONTENT_START_ROW);
}
