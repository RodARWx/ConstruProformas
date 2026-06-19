import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import {
  buildExportFilename,
  formatCurrency,
  formatDate,
} from '../helpers/filename.helper';
import { getExportsDirectory } from '../helpers/storage-path.helper';
import { ExportedFileInfo } from '../dto/export-result.dto';

type PdfDoc = InstanceType<typeof PDFDocument>;

/** Paleta institucional para PDF imprimible y mobile-first */
const COLORS = {
  navy: '#1B3A5C',
  gold: '#C9A227',
  text: '#1A1A1A',
  muted: '#5A6A7A',
  line: '#D0D7DE',
  white: '#FFFFFF',
};

@Injectable()
export class ProformaPdfExportService {
  async export(proforma: Proforma): Promise<ExportedFileInfo> {
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    );
    const absolutePath = join(getExportsDirectory(), filename);

    await this.renderPdf(proforma, absolutePath);

    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType: 'application/pdf',
    };
  }

  private renderPdf(proforma: Proforma, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 48, bottom: 48, left: 48, right: 48 },
        info: {
          Title: `Proforma ${proforma.idProforma}`,
          Author: 'Construmétrica',
          Subject: proforma.nombreProyecto,
        },
      });

      const stream = createWriteStream(outputPath);
      doc.pipe(stream);

      this.drawHeader(doc, proforma);
      this.drawMeta(doc, proforma);
      this.drawSection(doc, 'Datos del cliente', [
        ['Cliente', proforma.customer.nombreCliente],
        ['RUC / Cédula', proforma.customer.rucCedula],
        ['Dirección', proforma.customer.direccion ?? '—'],
        ['Teléfono', proforma.customer.telefono ?? '—'],
        ['Correo', proforma.customer.correo ?? '—'],
      ]);
      this.drawSection(doc, 'Perfil emisor', [
        ['Nombre', proforma.profile.nombre],
        ['Cargo', proforma.profile.cargo],
        ['SENESCYT', proforma.profile.registroSenescyt ?? '—'],
        ['Teléfono', proforma.profile.telefono ?? '—'],
        ['Correo', proforma.profile.correo ?? '—'],
      ]);
      this.drawItemsTable(doc, proforma);
      this.drawTotals(doc, proforma);

      if (proforma.notas) {
        this.drawNotes(doc, proforma.notas);
      }

      this.drawFooter(doc);

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private drawHeader(doc: PdfDoc, proforma: Proforma): void {
    const { width, margins } = doc.page;
    const contentWidth = width - margins.left - margins.right;

    doc
      .rect(margins.left, margins.top - 20, contentWidth, 52)
      .fill(COLORS.navy);

    doc
      .fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('CONSTRUMÉTRICA', margins.left, margins.top - 6, {
        width: contentWidth,
        align: 'center',
      });

    doc
      .fontSize(10)
      .text('Proforma de ingeniería civil', {
        width: contentWidth,
        align: 'center',
      });

    doc
      .fillColor(COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(proforma.idProforma, margins.left, margins.top + 44, {
        width: contentWidth,
        align: 'right',
      });

    doc.moveDown(0.5);
  }

  private drawMeta(doc: PdfDoc, proforma: Proforma): void {
    doc
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(proforma.nombreProyecto);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text(`Fecha: ${formatDate(proforma.fecha)}`)
      .text(`Tiempo de ejecución: ${proforma.tiempoEjecucion ?? '—'}`);

    doc.moveDown(0.8);
  }

  private drawSection(
    doc: PdfDoc,
    title: string,
    rows: [string, string][],
  ): void {
    const { margins, width } = doc.page;
    const contentWidth = width - margins.left - margins.right;

    doc
      .fillColor(COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(title.toUpperCase(), margins.left, doc.y, { width: contentWidth });

    doc.moveDown(0.3);

    rows.forEach(([label, value]) => {
      const y = doc.y;
      doc
        .fillColor(COLORS.muted)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(`${label}:`, margins.left, y, { width: 110, continued: false });

      doc
        .fillColor(COLORS.text)
        .font('Helvetica')
        .fontSize(9)
        .text(value, margins.left + 112, y, {
          width: contentWidth - 112,
        });
    });

    doc.moveDown(0.8);
  }

  private drawItemsTable(doc: PdfDoc, proforma: Proforma): void {
    const { margins, width } = doc.page;
    const startX = margins.left;
    const tableWidth = width - margins.left - margins.right;

    const columns = [
      { label: 'Cód.', width: 42 },
      { label: 'Descripción', width: 148 },
      { label: 'Tiempo', width: 48 },
      { label: 'Und.', width: 36 },
      { label: 'Cant.', width: 44, align: 'right' as const },
      { label: 'C.Unit.', width: 58, align: 'right' as const },
      { label: 'Total', width: 58, align: 'right' as const },
    ];

    doc
      .fillColor(COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('DETALLE DE RUBROS', startX, doc.y);

    doc.moveDown(0.4);

    const headerY = doc.y;
    let x = startX;

    doc.rect(startX, headerY, tableWidth, 20).fill(COLORS.navy);

    doc.fillColor(COLORS.white).fontSize(8);
    columns.forEach((col) => {
      doc.text(col.label, x + 4, headerY + 6, {
        width: col.width - 8,
        align: col.align ?? 'left',
      });
      x += col.width;
    });

    doc.y = headerY + 22;
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8);

    proforma.detalles.forEach((linea, rowIndex) => {
      const rowY = doc.y;

      if (rowY > doc.page.height - 120) {
        doc.addPage();
      }

      const fill = rowIndex % 2 === 0 ? '#F7F9FC' : COLORS.white;
      doc
        .rect(startX, doc.y, tableWidth, 18)
        .fill(fill);

      x = startX;
      const values = [
        linea.codigo ?? '—',
        linea.descripcion,
        linea.tiempo ?? '—',
        linea.unidad,
        linea.cantidad.toFixed(2),
        formatCurrency(linea.costoUnitario),
        formatCurrency(linea.total),
      ];

      doc.fillColor(COLORS.text);
      values.forEach((value, colIndex) => {
        doc.text(String(value), x + 4, doc.y + 4, {
          width: columns[colIndex].width - 8,
          align: columns[colIndex].align ?? 'left',
          lineBreak: false,
        });
        x += columns[colIndex].width;
      });

      doc.y = rowY + 18;
    });

    doc.moveDown(0.6);
  }

  private drawTotals(doc: PdfDoc, proforma: Proforma): void {
    const { margins, width } = doc.page;
    const labelX = width - margins.right - 180;
    const valueX = width - margins.right - 80;
    let y = doc.y;

    const rows: [string, string][] = [
      ['Subtotal', formatCurrency(proforma.subtotal)],
    ];

    if (proforma.iva > 0) {
      rows.push(['IVA', formatCurrency(proforma.iva)]);
    }

    rows.push(['TOTAL GENERAL', formatCurrency(proforma.totalGeneral)]);

    rows.forEach(([label, value], index) => {
      const isTotal = index === rows.length - 1;

      if (isTotal) {
        doc.rect(labelX - 10, y - 2, 190, 22).fill(COLORS.gold);
      }

      doc
        .fillColor(isTotal ? COLORS.navy : COLORS.muted)
        .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isTotal ? 11 : 10)
        .text(label, labelX, y, { width: 90, align: 'right' });

      doc
        .fillColor(COLORS.text)
        .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, valueX, y, { width: 80, align: 'right' });

      y += isTotal ? 26 : 18;
    });

    doc.y = y;
  }

  private drawNotes(doc: PdfDoc, notas: string): void {
    doc.moveDown(0.5);
    doc
      .fillColor(COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('NOTAS');

    doc
      .fillColor(COLORS.text)
      .font('Helvetica')
      .fontSize(9)
      .text(notas, { width: doc.page.width - 96 });
  }

  private drawFooter(doc: PdfDoc): void {
    const { margins, width } = doc.page;
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Documento generado por Construproformas — Construmétrica. Válido para impresión.',
        margins.left,
        doc.page.height - margins.bottom + 10,
        { width: width - margins.left - margins.right, align: 'center' },
      );
  }
}
