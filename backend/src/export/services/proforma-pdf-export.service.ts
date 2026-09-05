import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ExportedFileInfo } from '../dto/export-result.dto';
import { buildExportFilename } from '../helpers/filename.helper';
import {
  ensureProformaFolder,
  resolveVersionedFilename,
} from '../helpers/storage-path.helper';
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
   * Genera PDF y lo guarda en la carpeta estructurada de la proforma en el NAS.
   * Aplica versionado automático si el archivo base ya existe.
   */
  async exportFromXlsx(
    proforma: Proforma,
    _xlsxAbsolutePath: string,
    targetVersion?: number,
  ): Promise<ExportedFileInfo> {
    const folderPath = ensureProformaFolder(
      proforma.idProforma,
      proforma.nombreProyecto,
    );

    const baseFilename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    );

    const filename = resolveVersionedFilename(
      folderPath,
      baseFilename,
      targetVersion,
      proforma.idProforma,
    );
    const absolutePath = join(folderPath, filename);

    this.logger.log(`Generando PDF vía Puppeteer para ${proforma.idProforma} → ${filename}`);
    const prepared = await this.excelExportService.prepareForExport(proforma);
    await this.htmlPdfService.renderToPdf(prepared, absolutePath);

    return {
      filename,
      absolutePath,
      folderPath,
      mimeType: 'application/pdf',
    };
  }
}
