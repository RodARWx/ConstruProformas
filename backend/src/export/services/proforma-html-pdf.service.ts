import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import puppeteer from 'puppeteer';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { readLogoBuffer } from '../helpers/asset-path.helper';
import { buildExportFilename } from '../helpers/filename.helper';
import {
  buildProformaValidationUrl,
  generateQrCodeBuffer,
} from '../helpers/qr-code.helper';
import { buildProformaHtmlDocument } from '../templates/proforma-pdf.template';
import { ExportedFileInfo } from '../dto/export-result.dto';

/**
 * Genera PDF de alta fidelidad desde plantilla HTML + Chromium (Puppeteer).
 * Usado cuando LibreOffice no está instalado localmente.
 */
@Injectable()
export class ProformaHtmlPdfService {
  private readonly logger = new Logger(ProformaHtmlPdfService.name);

  constructor(private readonly configService: ConfigService) {}

  async export(proforma: Proforma, outputPath?: string): Promise<ExportedFileInfo> {
    const filename =
      outputPath != null
        ? outputPath.split(/[/\\]/).pop()!
        : buildExportFilename(
            proforma.idProforma,
            proforma.nombreProyecto,
            'pdf',
          );

    const absolutePath =
      outputPath ??
      `${process.cwd()}/data/exports/${filename}`;

    mkdirSync(dirname(absolutePath), { recursive: true });

    const ivaRate = Number(this.configService.get<string>('IVA_RATE', '0.15'));
    const validationUrl = buildProformaValidationUrl(proforma.idProforma);

    const [qrBuffer, logoBuffer] = await Promise.all([
      generateQrCodeBuffer(validationUrl, 140),
      Promise.resolve(readLogoBuffer()),
    ]);

    const html = buildProformaHtmlDocument(proforma, ivaRate, {
      logoBase64: logoBuffer?.toString('base64'),
      qrBase64: qrBuffer.toString('base64'),
    });

    await this.renderPdf(html, absolutePath);

    this.logger.log(`PDF generado vía plantilla HTML: ${absolutePath}`);

    return {
      filename,
      absolutePath,
      relativePath: `exports/${filename}`,
      mimeType: 'application/pdf',
    };
  }

  private async renderPdf(html: string, outputPath: string): Promise<void> {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '10mm',
          right: '12mm',
          bottom: '12mm',
          left: '12mm',
        },
      });
    } finally {
      await browser.close();
    }
  }
}
