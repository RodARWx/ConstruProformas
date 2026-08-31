import * as ExcelJS from 'exceljs';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { resolveProformaCustomerSnapshot } from '../../proformas/helpers/proforma-customer-snapshot.helper';
import { EXCEL_SHEET_NAME, A4_PAGE_SETUP, BRAND_COLORS_ARGB, EXCEL_LAYOUT } from '../constants/brand.constants';
import {
  CLIENT_META_LABELS,
  INSTITUTIONAL_COMPANY,
  TABLE_HEADERS,
} from '../constants/institutional.constants';
import {
  applyOuterContourBorder,
  excelThinBorder,
  fillSolid,
  fontBlack,
  fontBook,
  headerTableFont,
} from '../constants/excel-styles.constants';
import { readLogoBuffer, resolveProformaExcelTemplatePath } from './asset-path.helper';
import { formatCurrency, formatDate } from './filename.helper';
import {
  buildContactBlock,
  buildDynamicItemRows,
  buildNotesBlock,
  buildTotalsBlock,
  populateExcelTemplate,
  ProformaLayoutResult,
} from './proforma-excel-layout.helper';
import { resolveExportQrBuffer } from './qr-code.helper';

export interface ProformaWorkbookResult {
  workbook: ExcelJS.Workbook;
  layout: ProformaLayoutResult;
}

/**
 * Construye el libro Excel institucional desde la plantilla .xlsx oficial o desde cero como fallback.
 */
export async function buildProformaWorkbook(
  proforma: Proforma,
): Promise<ProformaWorkbookResult> {
  const templatePath = resolveProformaExcelTemplatePath();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Construproformas — Construmétrica';
  workbook.created = new Date();

  if (templatePath) {
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.worksheets[0];

    // Llenar metadatos en plantilla
    sheet.getCell('B1').value = `OBJETO DE COMPRA: ${proforma.idProforma.toUpperCase()} PROFORMA ${proforma.nombreProyecto.toUpperCase()}`;
    sheet.getCell('C4').value = proforma.idProforma;

    const customer = resolveProformaCustomerSnapshot(proforma);
    sheet.getCell('C5').value = customer.nombreCliente;
    sheet.getCell('C6').value = customer.rucCedula;
    sheet.getCell('C7').value = customer.direccion ?? '';
    sheet.getCell('C10').value = formatDate(proforma.fecha);

    const layout = populateExcelTemplate(sheet, proforma);
    await embedImages(workbook, sheet, proforma, layout.contactEndRow);

    const endRow = Math.max(layout.contactEndRow ?? 31, 31);
    applyOuterContourBorder(sheet, 1, endRow, 1, 7, 'medium');

    return { workbook, layout };
  }

  const sheet = workbook.addWorksheet(EXCEL_SHEET_NAME, {
    views: [{ showGridLines: false }],
    pageSetup: A4_PAGE_SETUP,
  });

  sheet.columns = [
    { width: 12 },
    { width: 36 },
    { width: 22 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
  ];

  buildFixedHeader(sheet, proforma);
  buildClientMetadata(sheet, proforma);
  buildTableHeader(sheet);

  const layout = buildDynamicItemRows(sheet, proforma.detalles, EXCEL_LAYOUT.itemsStartRow);
  const afterTotalsRow = buildTotalsBlock(sheet, proforma, layout);
  layout.notesStartRow = afterTotalsRow;
  layout.contactStartRow = buildNotesBlock(sheet, proforma, afterTotalsRow);
  const contactEndRow = buildContactBlock(sheet, proforma, layout.contactStartRow);
  layout.contactEndRow = contactEndRow;

  await embedImages(workbook, sheet, proforma, contactEndRow);

  const endRow = Math.max(contactEndRow, 31);
  applyOuterContourBorder(sheet, 1, endRow, 1, 7, 'medium');

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

  // Espacio entre datos de empresa y metadatos del cliente (fila 5 vacía en plantilla de referencia)
  sheet.getRow(EXCEL_LAYOUT.spacerRow).height = 15.5;
}

function buildClientMetadata(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
  const customer = resolveProformaCustomerSnapshot(proforma);
  const rows: [string, string][] = [
    [CLIENT_META_LABELS.cliente, customer.nombreCliente],
    [CLIENT_META_LABELS.ruc, customer.rucCedula],
    [CLIENT_META_LABELS.montoContrato, formatCurrency(proforma.montoContrato)],
    [
      CLIENT_META_LABELS.tiempoEjecucion,
      `${proforma.tiempoEjecucion ?? '0'} ${proforma.tipoDias ?? 'Días Laborables'}`,
    ],
    [CLIENT_META_LABELS.fecha, formatDate(proforma.fecha)],
  ];

  rows.forEach(([label, value], index) => {
    const rowNum = EXCEL_LAYOUT.clientMetaStartRow + index;
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
  const row1 = EXCEL_LAYOUT.tableHeaderRow1;
  const row2 = EXCEL_LAYOUT.tableHeaderRow2;
  const row11 = sheet.getRow(row1);
  const row12 = sheet.getRow(row2);

  sheet.mergeCells(`A${row1}:A${row2}`);
  sheet.mergeCells(`B${row1}:B${row2}`);
  sheet.mergeCells(`C${row1}:C${row2}`);
  sheet.mergeCells(`D${row1}:D${row2}`);
  sheet.mergeCells(`E${row1}:G${row1}`);

  const headers11 = [
    { col: 1, text: TABLE_HEADERS.row1.codigo },
    { col: 2, text: TABLE_HEADERS.row1.descripcion },
    { col: 3, text: TABLE_HEADERS.row1.tiempo },
    { col: 4, text: TABLE_HEADERS.row1.unidad },
    { col: 5, text: TABLE_HEADERS.row1.contratado },
  ];

  // Aplica borde y fondo a todas las celdas de la cabecera (A12:G13)
  for (let r = row1; r <= row2; r++) {
    for (let c = 1; c <= 7; c++) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = excelThinBorder;
      cell.fill = headerFill;
    }
  }

  headers11.forEach(({ col, text }) => {
    const cell = row11.getCell(col);
    cell.value = text;
    cell.font = headerTableFont();
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  ['CANTIDAD', 'C. UNIT.', 'TOTAL'].forEach((text, index) => {
    const cell = row12.getCell(5 + index);
    cell.value = text;
    cell.font = headerTableFont();
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

}



async function embedImages(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  proforma: Proforma,
  contactEndRow: number,
): Promise<void> {
  try {
    const logoBuffer = readLogoBuffer();
    if (logoBuffer) {
      const logoId = workbook.addImage({
        // ExcelJS typings esperan Buffer legacy; Node 22 usa Buffer generic
        buffer: logoBuffer as never,
        extension: 'png',
      });
      sheet.addImage(logoId, {
        tl: { col: 5.123, row: 0.2 },
        ext: { width: 165, height: 52 },
      });
    }
  } catch (err) {
    console.error('Error al incrustar el logo en Excel:', err);
  }

  try {
    const qrBuffer = await resolveExportQrBuffer(proforma.profile, proforma.idProforma);
    if (qrBuffer) {
      const qrId = workbook.addImage({
        buffer: qrBuffer as never,
        extension: 'png',
      });

      const { profileQr } = EXCEL_LAYOUT;
      const lastContactRow = contactEndRow - 1;
      const qrTopRow = Math.max(0, lastContactRow + profileQr.bottomRowOffset - profileQr.heightInRows);
      const topRowInt = Math.floor(qrTopRow);
      const topRowFrac = qrTopRow - topRowInt;

      const colOffUnit = Math.round(((profileQr as any).colOffsetPx ?? 90) * 10000);

      sheet.addImage(qrId, {
        tl: {
          nativeCol: 5,
          nativeColOff: colOffUnit,
          nativeRow: topRowInt,
          nativeRowOff: Math.round(topRowFrac * 180000),
        } as any,
        ext: { width: profileQr.sizePx, height: profileQr.sizePx },
      });
    }
  } catch (err) {
    console.error('Error al incrustar el QR en Excel:', err);
  }

  try {
    sheet.getRow(contactEndRow + 1).height = 15.5;
  } catch { }
}
