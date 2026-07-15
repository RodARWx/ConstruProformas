import { Injectable, Logger } from '@nestjs/common';
import { writeFile, unlink } from 'fs/promises';
import puppeteer from 'puppeteer';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { resolveExportQrBuffer } from '../helpers/qr-code.helper';
import { readLogoBuffer } from '../helpers/asset-path.helper';
import { renderProformaHtml } from '../templates/proforma-pdf.template';

@Injectable()
export class ProformaHtmlPdfService {
  private readonly logger = new Logger(ProformaHtmlPdfService.name);

  /**
   * Fallback PDF: renderiza plantilla HTML institucional con Puppeteer.
   */
  async renderToPdf(proforma: Proforma, outputPath: string): Promise<void> {
    const qrBuffer = await resolveExportQrBuffer(proforma.profile, proforma.idProforma);
    const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;

    let logoDataUrl: string | undefined;
    const logoBuffer = readLogoBuffer();
    if (logoBuffer) {
      logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }

    const html = renderProformaHtml(proforma, qrDataUrl, logoDataUrl);

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
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      });
    } finally {
      await browser?.close().catch(() => undefined);
      await unlink(htmlPath).catch(() => undefined);
    }

    this.logger.warn(
      `PDF generado con fallback HTML/Puppeteer para ${proforma.idProforma}`,
    );
  }
}
