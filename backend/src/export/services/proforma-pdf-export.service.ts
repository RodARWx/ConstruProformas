import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ExportedFileInfo } from '../dto/export-result.dto';
import { buildExportFilename } from '../helpers/filename.helper';
import { convertXlsxToPdf } from '../helpers/libreoffice.helper';
import { getExportsDirectory } from '../helpers/storage-path.helper';
import { ProformaExcelExportService } from './proforma-excel-export.service';
import { ProformaHtmlPdfService } from './proforma-html-pdf.service';

@Injectable()
export class ProformaPdfExportService {
  private readonly logger = new Logger(ProformaPdfExportService.name);

  constructor(
    private readonly htmlPdfService: ProformaHtmlPdfService,
    private readonly excelExportService: ProformaExcelExportService,
  ) {}

  /**
   * Genera PDF a partir del Excel exportado.
   * 1. LibreOffice headless (local o Docker)
   * 2. Fallback HTML + Puppeteer (con categorías del catálogo)
   */
  async exportFromXlsx(
    proforma: Proforma,
    xlsxAbsolutePath: string,
  ): Promise<ExportedFileInfo> {
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    );
    const absolutePath = join(getExportsDirectory(), filename);

    const conversion = await convertXlsxToPdf(xlsxAbsolutePath, getExportsDirectory());

    if (conversion) {
      this.logger.log(
        `PDF vía LibreOffice (${conversion.method}) para ${proforma.idProforma}`,
      );

      if (conversion.pdfPath !== absolutePath && existsSync(conversion.pdfPath)) {
        const { renameSync } = await import('fs');
        renameSync(conversion.pdfPath, absolutePath);
      }
    } else {
      this.logger.warn(
        `LibreOffice no disponible; usando fallback Puppeteer para ${proforma.idProforma}`,
      );
      const prepared = await this.excelExportService.prepareForExport(proforma);
      await this.htmlPdfService.renderToPdf(prepared, absolutePath);
    }

    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType: 'application/pdf',
    };
  }
}
