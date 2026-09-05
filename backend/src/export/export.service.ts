import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { existsSync } from 'fs';
import { ProformaStatus } from '../proformas/enums/proforma-status.enum';
import { ProformasService } from '../proformas/proformas.service';
import { ProformaExportResult } from './dto/export-result.dto';
import {
  ensureProformaFolder,
  getMaxVersionInFolder,
  listProformaFiles,
} from './helpers/storage-path.helper';
import { ProformaExcelExportService } from './services/proforma-excel-export.service';
import { ProformaPdfExportService } from './services/proforma-pdf-export.service';

export type ExportFormat = 'excel' | 'pdf' | 'both';

@Injectable()
export class ExportService {
  constructor(
    @Inject(forwardRef(() => ProformasService))
    private readonly proformasService: ProformasService,
    private readonly excelExportService: ProformaExcelExportService,
    private readonly pdfExportService: ProformaPdfExportService,
  ) {}

  /**
   * Genera una versión completa (tanto Excel como PDF) en el servidor/NAS.
   * Si forceNewVersion es true, incrementa la versión (V1 -> V2 -> V3).
   * Marca automáticamente la proforma como EXPORTED.
   */
  async generateVersion(
    idProforma: string,
    forceNewVersion = true,
  ): Promise<ProformaExportResult> {
    const proforma = await this.proformasService.findOne(idProforma);
    const folderPath = ensureProformaFolder(
      proforma.idProforma,
      proforma.nombreProyecto,
    );

    const maxExisting = getMaxVersionInFolder(
      folderPath,
      proforma.idProforma,
    );
    const targetVersion = forceNewVersion
      ? maxExisting === 0
        ? 1
        : maxExisting + 1
      : Math.max(1, maxExisting);

    // Generar tanto Excel como PDF coordinados en la misma versión
    const excelInfo = await this.excelExportService.export(
      proforma,
      targetVersion,
    );
    const pdfInfo = await this.pdfExportService.exportFromXlsx(
      proforma,
      excelInfo.absolutePath,
      targetVersion,
    );

    await this.proformasService.markAsExported(idProforma);

    return {
      idProforma: proforma.idProforma,
      nombreProyecto: proforma.nombreProyecto,
      folderPath,
      status: ProformaStatus.EXPORTED,
      excel: excelInfo,
      pdf: pdfInfo,
    };
  }

  /**
   * Obtiene o genera los archivos de exportación de una proforma.
   * Si la proforma ya fue guardada/exportada y los archivos de la versión más reciente
   * existen en disco, los devuelve directamente SIN crear una versión nueva.
   * Solo si algún archivo falta, lo genera para la versión actual.
   */
  async exportProforma(
    idProforma: string,
    format: ExportFormat = 'both',
  ): Promise<ProformaExportResult> {
    const proforma = await this.proformasService.findOne(idProforma);
    const folderPath = ensureProformaFolder(
      proforma.idProforma,
      proforma.nombreProyecto,
    );

    const result: ProformaExportResult = {
      idProforma: proforma.idProforma,
      nombreProyecto: proforma.nombreProyecto,
      folderPath,
      status: proforma.status,
    };

    const existingFiles = listProformaFiles(
      proforma.idProforma,
      proforma.nombreProyecto,
    );
    const latestExcel = existingFiles.find(
      (f) => f.extension === 'xlsx' && f.isLatest,
    );
    const latestPdf = existingFiles.find(
      (f) => f.extension === 'pdf' && f.isLatest,
    );

    // Si no existe ningún archivo exportado para la proforma, generamos V1
    if (!latestExcel && !latestPdf) {
      return this.generateVersion(idProforma, true);
    }

    const targetVersion = Math.max(
      latestExcel?.version ?? 1,
      latestPdf?.version ?? 1,
    );

    // ── Excel ──
    if (format === 'excel' || format === 'both') {
      if (
        latestExcel &&
        latestExcel.version === targetVersion &&
        existsSync(latestExcel.absolutePath)
      ) {
        result.excel = {
          filename: latestExcel.filename,
          absolutePath: latestExcel.absolutePath,
          folderPath,
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        result.excel = await this.excelExportService.export(
          proforma,
          targetVersion,
        );
      }
    }

    // ── PDF ──
    if (format === 'pdf' || format === 'both') {
      if (
        latestPdf &&
        latestPdf.version === targetVersion &&
        existsSync(latestPdf.absolutePath)
      ) {
        result.pdf = {
          filename: latestPdf.filename,
          absolutePath: latestPdf.absolutePath,
          folderPath,
          mimeType: 'application/pdf',
        };
      } else {
        const xlsxPath =
          result.excel?.absolutePath ?? latestExcel?.absolutePath ?? '';
        result.pdf = await this.pdfExportService.exportFromXlsx(
          proforma,
          xlsxPath,
          targetVersion,
        );
      }
    }

    return result;
  }
}
