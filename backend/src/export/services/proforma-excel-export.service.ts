import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { buildExportFilename } from '../helpers/filename.helper';
import { getExportsDirectory } from '../helpers/storage-path.helper';
import { ExportedFileInfo } from '../dto/export-result.dto';

/** Colores institucionales Construmétrica */
const BRAND_NAVY = 'FF1B3A5C';
const BRAND_GOLD = 'FFC9A227';
const HEADER_FILL = 'FFE8EEF4';
const BORDER_COLOR = 'FFB0BEC5';

@Injectable()
export class ProformaExcelExportService {
  async export(proforma: Proforma): Promise<ExportedFileInfo> {
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'xlsx',
    );
    const absolutePath = join(getExportsDirectory(), filename);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Construproformas';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Proforma', {
      views: [{ showGridLines: false }],
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
      },
    });

    sheet.columns = [
      { width: 14 },
      { width: 38 },
      { width: 14 },
      { width: 10 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
    ];

    this.buildHeader(sheet, proforma);
    this.buildProjectInfo(sheet, proforma);
    this.buildClientInfo(sheet, proforma);
    this.buildEmitterInfo(sheet, proforma);
    this.buildItemsTable(sheet, proforma);
    this.buildTotals(sheet, proforma);
    this.buildNotes(sheet, proforma);

    await workbook.xlsx.writeFile(absolutePath);

    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private buildHeader(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    sheet.mergeCells('A1:G1');
    const title = sheet.getCell('A1');
    title.value = 'CONSTRUMÉTRICA — PROFORMA';
    title.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    title.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_NAVY },
    };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:G2');
    const subtitle = sheet.getCell('A2');
    subtitle.value = `Documento: ${proforma.idProforma}`;
    subtitle.font = { bold: true, size: 11, color: { argb: BRAND_NAVY } };
    subtitle.alignment = { horizontal: 'center' };
    sheet.getRow(2).height = 20;
  }

  private buildProjectInfo(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    sheet.mergeCells('A4:B4');
    sheet.getCell('A4').value = 'Proyecto';
    sheet.getCell('A4').font = { bold: true };

    sheet.mergeCells('C4:G4');
    sheet.getCell('C4').value = proforma.nombreProyecto;

    sheet.mergeCells('A5:B5');
    sheet.getCell('A5').value = 'Fecha';
    sheet.getCell('A5').font = { bold: true };
    sheet.getCell('C5').value = proforma.fecha;

    sheet.mergeCells('A6:B6');
    sheet.getCell('A6').value = 'Tiempo de ejecución';
    sheet.getCell('A6').font = { bold: true };
    sheet.mergeCells('C6:G6');
    sheet.getCell('C6').value = proforma.tiempoEjecucion ?? '—';
  }

  private buildClientInfo(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    const row = 8;
    sheet.mergeCells(`A${row}:G${row}`);
    const label = sheet.getCell(`A${row}`);
    label.value = 'DATOS DEL CLIENTE';
    label.font = { bold: true, color: { argb: BRAND_NAVY } };
    label.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };

    const rows: [string, string][] = [
      ['Cliente', proforma.customer.nombreCliente],
      ['RUC / Cédula', proforma.customer.rucCedula],
      ['Dirección', proforma.customer.direccion ?? '—'],
      ['Teléfono', proforma.customer.telefono ?? '—'],
      ['Correo', proforma.customer.correo ?? '—'],
    ];

    rows.forEach(([key, value], index) => {
      const r = row + 1 + index;
      sheet.getCell(`A${r}`).value = key;
      sheet.getCell(`A${r}`).font = { bold: true };
      sheet.mergeCells(`B${r}:G${r}`);
      sheet.getCell(`B${r}`).value = value;
    });
  }

  private buildEmitterInfo(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    const row = 15;
    sheet.mergeCells(`A${row}:G${row}`);
    const label = sheet.getCell(`A${row}`);
    label.value = 'PERFIL EMISOR';
    label.font = { bold: true, color: { argb: BRAND_NAVY } };
    label.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };

    const rows: [string, string][] = [
      ['Nombre', proforma.profile.nombre],
      ['Cargo', proforma.profile.cargo],
      ['Registro SENESCYT', proforma.profile.registroSenescyt ?? '—'],
      ['Teléfono', proforma.profile.telefono ?? '—'],
      ['Correo', proforma.profile.correo ?? '—'],
    ];

    rows.forEach(([key, value], index) => {
      const r = row + 1 + index;
      sheet.getCell(`A${r}`).value = key;
      sheet.getCell(`A${r}`).font = { bold: true };
      sheet.mergeCells(`B${r}:G${r}`);
      sheet.getCell(`B${r}`).value = value;
    });
  }

  private buildItemsTable(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    const headerRow = 22;
    const headers = [
      'Código',
      'Descripción',
      'Tiempo',
      'Unidad',
      'Cantidad',
      'Costo Unit.',
      'Total',
    ];

    const header = sheet.getRow(headerRow);
    headers.forEach((text, index) => {
      const cell = header.getCell(index + 1);
      cell.value = text;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: BRAND_NAVY },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = this.thinBorder();
    });
    header.height = 22;

    proforma.detalles.forEach((linea, index) => {
      const row = sheet.getRow(headerRow + 1 + index);
      const values = [
        linea.codigo ?? '—',
        linea.descripcion,
        linea.tiempo ?? '—',
        linea.unidad,
        linea.cantidad,
        linea.costoUnitario,
        linea.total,
      ];

      values.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.border = this.thinBorder();

        if (colIndex >= 4) {
          cell.numFmt = colIndex === 4 ? '#,##0.00' : '$#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });
    });
  }

  private buildTotals(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    const startRow = 22 + proforma.detalles.length + 2;

    const totals: [string, number][] = [
      ['Subtotal', proforma.subtotal],
    ];

    if (proforma.iva > 0) {
      totals.push(['IVA', proforma.iva]);
    }

    totals.push(['TOTAL GENERAL', proforma.totalGeneral]);

    totals.forEach(([label, amount], index) => {
      const rowNum = startRow + index;
      sheet.mergeCells(`A${rowNum}:F${rowNum}`);
      const labelCell = sheet.getCell(`A${rowNum}`);
      labelCell.value = label;
      labelCell.font = {
        bold: index === totals.length - 1,
        color: { argb: index === totals.length - 1 ? BRAND_NAVY : undefined },
      };
      labelCell.alignment = { horizontal: 'right' };

      const valueCell = sheet.getCell(`G${rowNum}`);
      valueCell.value = amount;
      valueCell.numFmt = '$#,##0.00';
      valueCell.font = { bold: index === totals.length - 1 };
      if (index === totals.length - 1) {
        valueCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: BRAND_GOLD },
        };
      }
      valueCell.alignment = { horizontal: 'right' };
      valueCell.border = this.thinBorder();
    });
  }

  private buildNotes(sheet: ExcelJS.Worksheet, proforma: Proforma): void {
    if (!proforma.notas) {
      return;
    }

    const row = 22 + proforma.detalles.length + 8;
    sheet.mergeCells(`A${row}:G${row}`);
    sheet.getCell(`A${row}`).value = 'NOTAS';
    sheet.getCell(`A${row}`).font = { bold: true, color: { argb: BRAND_NAVY } };

    sheet.mergeCells(`A${row + 1}:G${row + 3}`);
    sheet.getCell(`A${row + 1}`).value = proforma.notas;
    sheet.getCell(`A${row + 1}`).alignment = { wrapText: true, vertical: 'top' };
  }

  private thinBorder(): Partial<ExcelJS.Borders> {
    const side = { style: 'thin' as const, color: { argb: BORDER_COLOR } };
    return { top: side, left: side, bottom: side, right: side };
  }
}
