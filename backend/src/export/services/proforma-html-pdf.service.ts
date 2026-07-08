import { Injectable, Logger } from '@nestjs/common';
import { writeFile, unlink } from 'fs/promises';
import puppeteer from 'puppeteer';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { resolveExportQrBuffer } from '../helpers/qr-code.helper';
import { renderProformaHtml } from '../templates/proforma-pdf.template';
import { readLogoBuffer } from '../helpers/asset-path.helper';
import { roundMoney } from '../../proformas/helpers/proforma-calculator.helper';

@Injectable()
export class ProformaHtmlPdfService {
  private readonly logger = new Logger(ProformaHtmlPdfService.name);

  constructor() {}

  async renderToPdf(proforma: Proforma, outputPath: string): Promise<void> {
    const qrBuffer = await resolveExportQrBuffer(proforma.profile, proforma.idProforma);
    const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;

    // --- Logo ---
    const logoBuffer = readLogoBuffer();
    let logoDataUrl: string | undefined;
    if (logoBuffer) {
      logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }

    // --- Derivar descuento de forma directa y limpia ---
    const descuentoTotal = Math.max(
      0,
      roundMoney(proforma.subtotal - (proforma.totalGeneral - proforma.iva)),
    );
    const descuentoPorcentaje =
      proforma.subtotal > 0 ? (descuentoTotal / proforma.subtotal) * 100 : 0;

    // --- Pasar todo al template (ahora 5 parámetros) ---
    const html = renderProformaHtml(
      proforma,
      qrDataUrl,
      logoDataUrl,
      descuentoTotal,
      descuentoPorcentaje,
    );

    const htmlPath = `${outputPath}.html`;
    await writeFile(htmlPath, html, 'utf8');

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      });
    } finally {
      await browser?.close().catch(() => undefined);
      await unlink(htmlPath).catch(() => undefined);
    }

    this.logger.warn(
      `PDF generado con HTML/Puppeteer para ${proforma.idProforma}`,
    );
  }
}