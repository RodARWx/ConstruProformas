import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { buildExportFilename } from '../helpers/filename.helper';
import {
  convertExcelToPdf,
  convertExcelToPdfViaDocker,
  isDockerAvailable,
  isLibreOfficeAvailable,
} from '../helpers/libreoffice.helper';
import { getExportsDirectory } from '../helpers/storage-path.helper';
import { ExportedFileInfo } from '../dto/export-result.dto';
import { ProformaHtmlPdfService } from './proforma-html-pdf.service';

@Injectable()
export class ProformaPdfExportService {
  private readonly logger = new Logger(ProformaPdfExportService.name);

  constructor(private readonly htmlPdfService: ProformaHtmlPdfService) {}

  /**
   * Prioridad de conversión PDF:
   * 1. LibreOffice local (idéntico al Excel)
   * 2. LibreOffice vía Docker
   * 3. Plantilla HTML + Puppeteer (tabla completa, alta fidelidad)
   */
  async exportFromExcel(
    excelAbsolutePath: string,
    proforma: Proforma,
  ): Promise<ExportedFileInfo> {
    const outputDir = getExportsDirectory();
    const expectedFilename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    );
    const expectedPath = join(outputDir, expectedFilename);

    if (await isLibreOfficeAvailable()) {
      const pdfPath = await convertExcelToPdf(excelAbsolutePath, outputDir);
      this.logger.log(`PDF idéntico al Excel (LibreOffice): ${pdfPath}`);
      return this.buildResult(expectedFilename, pdfPath);
    }

    if (await isDockerAvailable()) {
      try {
        const pdfPath = await convertExcelToPdfViaDocker(
          excelAbsolutePath,
          outputDir,
        );
        this.logger.log(`PDF idéntico al Excel (Docker LO): ${pdfPath}`);
        return this.buildResult(expectedFilename, pdfPath);
      } catch (error) {
        this.logger.warn(
          `Conversión Docker LibreOffice falló: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.warn(
      'LibreOffice no disponible. Generando PDF con plantilla HTML profesional.',
    );
    return this.htmlPdfService.export(proforma, expectedPath);
  }

  private buildResult(filename: string, absolutePath: string): ExportedFileInfo {
    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType: 'application/pdf',
    };
  }
}
