import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { ProformaStatus } from '../proformas/enums/proforma-status.enum';
import { ProformasService } from '../proformas/proformas.service';
import { ProformaExportResult } from './dto/export-result.dto';
import { buildExportFilename } from './helpers/filename.helper';
import {
  buildProformaFolderPath,
  ensureProformaFolder,
} from './helpers/storage-path.helper';
import { join } from 'path';
import { ProformaExcelExportService } from './services/proforma-excel-export.service';
import { ProformaPdfExportService } from './services/proforma-pdf-export.service';

export type ExportFormat = 'excel' | 'pdf' | 'both';

@Injectable()
export class ExportService {
  constructor(
    private readonly proformasService: ProformasService,
    private readonly excelExportService: ProformaExcelExportService,
    private readonly pdfExportService: ProformaPdfExportService,
  ) {}

  /**
   * Genera archivos de exportación y los guarda en la carpeta estructurada del NAS.
   *
   * Versionado inteligente:
   * - Si el archivo base ya existe Y la proforma no ha cambiado desde la última exportación
   *   (status === EXPORTED), se sirve el archivo existente sin regenerar.
   * - Si la proforma fue modificada (status !== EXPORTED), siempre genera un nuevo archivo
   *   (con sufijo _V2, _V3... si el base ya existe) y marca como EXPORTED.
   */
  async exportProforma(
    idProforma: string,
    format: ExportFormat = 'both',
  ): Promise<ProformaExportResult> {
    const proforma = await this.proformasService.findOne(idProforma);
    const folderPath = buildProformaFolderPath(
      proforma.idProforma,
      proforma.nombreProyecto,
    );

    const result: ProformaExportResult = {
      idProforma: proforma.idProforma,
      nombreProyecto: proforma.nombreProyecto,
      folderPath,
      status: proforma.status,
    };

    // ── Comprobar si la proforma ya está exportada y el archivo existe ──
    // Si status === EXPORTED y el archivo base ya existe en disco, no regeneramos.
    const alreadyExported = proforma.status === ProformaStatus.EXPORTED;

    const baseXlsxFilename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'xlsx',
    );
    const basePdfFilename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    );

    const existingXlsxPath = join(folderPath, baseXlsxFilename);
    const existingPdfPath = join(folderPath, basePdfFilename);

    const xlsxAlreadyOnDisk = existsSync(existingXlsxPath);
    const pdfAlreadyOnDisk = existsSync(existingPdfPath);

    // ── Excel ──
    if (format === 'excel' || format === 'both') {
      if (alreadyExported && xlsxAlreadyOnDisk) {
        // Servir archivo existente sin regenerar
        result.excel = {
          filename: baseXlsxFilename,
          absolutePath: existingXlsxPath,
          folderPath,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        ensureProformaFolder(proforma.idProforma, proforma.nombreProyecto);
        result.excel = await this.excelExportService.export(proforma);
      }
    }

    // ── PDF ──
    if (format === 'pdf' || format === 'both') {
      if (alreadyExported && pdfAlreadyOnDisk) {
        // Servir archivo existente sin regenerar
        result.pdf = {
          filename: basePdfFilename,
          absolutePath: existingPdfPath,
          folderPath,
          mimeType: 'application/pdf',
        };
      } else {
        // Necesitamos xlsx como fuente (aunque no lo retornemos si format===pdf)
        const xlsxPath = result.excel?.absolutePath ?? existingXlsxPath;
        ensureProformaFolder(proforma.idProforma, proforma.nombreProyecto);
        result.pdf = await this.pdfExportService.exportFromXlsx(proforma, xlsxPath);

        if (format === 'pdf' && result.excel) {
          delete result.excel;
        }
      }
    }

    // Marcar como EXPORTED solo si se generó algo nuevo
    if (!alreadyExported) {
      await this.proformasService.markAsExported(idProforma);
      result.status = ProformaStatus.EXPORTED;
    }

    return result;
  }
}
