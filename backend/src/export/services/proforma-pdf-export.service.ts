import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ExportedFileInfo } from '../dto/export-result.dto';
import { buildExportFilename } from '../helpers/filename.helper';
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
   * Genera PDF directamente desde HTML (Puppeteer) para garantizar la correcta
   * visualización del logo y los descuentos. 
   */
  async exportFromXlsx(
    proforma: Proforma,
    xlsxAbsolutePath: string, // Se mantiene por compatibilidad, pero no se usa
  ): Promise<ExportedFileInfo> {
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    );
    const absolutePath = join(getExportsDirectory(), filename);

    // Preparamos la proforma (añade categorías)
    const prepared = await this.excelExportService.prepareForExport(proforma);

    // Generamos PDF directamente con HTML
    await this.htmlPdfService.renderToPdf(prepared, absolutePath);

    this.logger.log(`PDF generado con HTML/Puppeteer para ${proforma.idProforma}`);

    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType: 'application/pdf',
    };
  }
} 