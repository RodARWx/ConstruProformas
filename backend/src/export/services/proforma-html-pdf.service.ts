import { Injectable, Logger } from '@nestjs/common';
import { writeFile, unlink } from 'fs/promises';
import puppeteer from 'puppeteer';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { generateValidationQrBuffer } from '../helpers/qr-code.helper';
import { renderProformaHtml } from '../templates/proforma-pdf.template';

@Injectable()
export class ProformaHtmlPdfService {
  private readonly logger = new Logger(ProformaHtmlPdfService.name);

  /**
   * Fallback PDF: renderiza plantilla HTML institucional con Puppeteer.
   */
  async renderToPdf(proforma: Proforma, outputPath: string): Promise<void> {
    const qrBuffer = await generateValidationQrBuffer(proforma.idProforma);
    const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
    const html = renderProformaHtml(proforma, qrDataUrl);

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
      `PDF generado con fallback HTML/Puppeteer para ${proforma.idProforma}`,
    );
  }
}
