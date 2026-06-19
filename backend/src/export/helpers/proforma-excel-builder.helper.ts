import * as ExcelJS from 'exceljs';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { EXCEL_SHEET_NAME, A4_PAGE_SETUP, BRAND_COLORS_ARGB } from '../constants/brand.constants';
import {
  CLIENT_META_LABELS,
  INSTITUTIONAL_COMPANY,
  TABLE_HEADERS,
} from '../constants/institutional.constants';
import {
  excelThinBorder,
  fillSolid,
  fontBlack,
  fontBook,
  headerTableFont,
} from '../constants/excel-styles.constants';
import { readLogoBuffer } from './asset-path.helper';
import { formatCurrency, formatDate } from './filename.helper';
import {
  buildContactBlock,
  buildDynamicItemRows,
  buildNotesBlock,
  buildTotalsBlock,
  ProformaLayoutResult,
} from './proforma-excel-layout.helper';
import { generateValidationQrBuffer } from './qr-code.helper';

export interface ProformaWorkbookResult {
  workbook: ExcelJS.Workbook;
  layout: ProformaLayoutResult;
}

/**
 * Construye el libro Excel institucional DESDE CERO (sin plantilla).
 * Hoja "PROFORMA" con estructura fija + filas dinámicas.
 */
export async function buildProformaWorkbook(
  proforma: Proforma,
): Promise<ProformaWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Construproformas — Construmétrica';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(EXCEL_SHEET_NAME, {
    views: [{ showGridLines: false }],
    pageSetup: A4_PAGE_SETUP,
  });

  sheet.columns = [
    { width: 12 },
    { width: 36 },
    { width: 14 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
  ];

  buildFixedHeader(sheet, proforma);
  buildClientMetadata(sheet, proforma);
  buildTableHeader(sheet);

  const layout = buildDynamicItemRows(sheet, proforma.detalles, 13);
  const afterTotalsRow = buildTotalsBlock(sheet, proforma, layout);
  layout.notesStartRow = afterTotalsRow;
  layout.contactStartRow = buildNotesBlock(sheet, proforma, afterTotalsRow);
  const contactEndRow = buildContactBlock(sheet, proforma, layout.contactStartRow);

  await embedImages(workbook, sheet, proforma, contactEndRow);

  return { workbook, layout };
}

function buildFixedHeader(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
  sheet.mergeCells('A1:E1');
  const projectCell = sheet.getCell('A1');
  projectCell.value = `PROYECTO: ${proforma.idProforma}-${proforma.nombreProyecto}`;
  projectCell.font = fontBlack();
  projectCell.alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:G2');
  const companyCell = sheet.getCell('A2');
  companyCell.value = INSTITUTIONAL_COMPANY.nombre;
  companyCell.font = fontBlack();
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 28;

  sheet.mergeCells('A3:G3');
  sheet.getCell('A3').value = INSTITUTIONAL_COMPANY.direccion;
  sheet.getCell('A3').font = fontBook();
  sheet.getCell('A3').alignment = { horizontal: 'center' };

  sheet.mergeCells('A4:G4');
  sheet.getCell('A4').value = `RUC: ${INSTITUTIONAL_COMPANY.ruc}`;
  sheet.getCell('A4').font = fontBook();
  sheet.getCell('A4').alignment = { horizontal: 'center' };
}

function buildClientMetadata(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
  const rows: [string, string][] = [
    [CLIENT_META_LABELS.cliente, proforma.customer.nombreCliente],
    [CLIENT_META_LABELS.ruc, proforma.customer.rucCedula],
    [CLIENT_META_LABELS.montoContrato, formatCurrency(proforma.montoContrato)],
    [CLIENT_META_LABELS.tiempoEjecucion, proforma.tiempoEjecucion ?? '0'],
    [CLIENT_META_LABELS.fecha, formatDate(proforma.fecha)],
  ];

  rows.forEach(([label, value], index) => {
    const rowNum = 5 + index;
    sheet.mergeCells(`A${rowNum}:B${rowNum}`);
    sheet.getCell(`A${rowNum}`).value = label;
    sheet.getCell(`A${rowNum}`).font = fontBlack();
    sheet.mergeCells(`C${rowNum}:G${rowNum}`);
    sheet.getCell(`C${rowNum}`).value = value;
    sheet.getCell(`C${rowNum}`).font = fontBook();
  });
}

function buildTableHeader(sheet: ExcelJS.Worksheet): void {
  const headerFill = fillSolid(BRAND_COLORS_ARGB.burgundy);
  const row11 = sheet.getRow(11);
  const row12 = sheet.getRow(12);

  sheet.mergeCells('A11:A12');
  sheet.mergeCells('B11:B12');
  sheet.mergeCells('C11:C12');
  sheet.mergeCells('D11:D12');
  sheet.mergeCells('E11:G11');

  const headers11 = [
    { col: 1, text: TABLE_HEADERS.row1.codigo },
    { col: 2, text: TABLE_HEADERS.row1.descripcion },
    { col: 3, text: TABLE_HEADERS.row1.tiempo },
    { col: 4, text: TABLE_HEADERS.row1.unidad },
    { col: 5, text: TABLE_HEADERS.row1.contratado },
  ];

  headers11.forEach(({ col, text }) => {
    const cell = row11.getCell(col);
    cell.value = text;
    cell.font = headerTableFont();
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = excelThinBorder;
  });

  ['CANTIDAD', 'C. UNIT.', 'TOTAL'].forEach((text, index) => {
    const cell = row12.getCell(5 + index);
    cell.value = text;
    cell.font = headerTableFont();
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = excelThinBorder;
  });

  row11.height = 26;
  row12.height = 22;
}

async function embedImages(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  afterContactRow: number,
): Promise<void> {
  const logoBuffer = readLogoBuffer();
  if (logoBuffer) {
    const logoId = workbook.addImage({
      // ExcelJS typings esperan Buffer legacy; Node 22 usa Buffer generic
      buffer: logoBuffer as never,
      extension: 'png',
    });
    sheet.addImage(logoId, {
      tl: { col: 5.2, row: 0.1 },
      ext: { width: 130, height: 42 },
    });
  }

  const qrBuffer = await generateValidationQrBuffer(proforma.idProforma);
  const qrId = workbook.addImage({
    buffer: qrBuffer as never,
    extension: 'png',
  });

  const qrRow = afterContactRow + 1;
  sheet.getCell(`A${qrRow}`).value = 'Validación digital';
  sheet.getCell(`A${qrRow}`).font = fontBook();

  sheet.addImage(qrId, {
    tl: { col: 5.5, row: qrRow - 1 },
    ext: { width: 90, height: 90 },
  });
}
