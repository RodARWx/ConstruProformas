import { Injectable } from '@nestjs/common';
import { ProformaStatus } from '../proformas/enums/proforma-status.enum';
import { ProformasService } from '../proformas/proformas.service';
import { ProformaExportResult } from './dto/export-result.dto';
import { getExportsDirectory } from './helpers/storage-path.helper';
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
   * Genera archivos de exportación y marca la proforma como EXPORTED.
   * El PDF se genera siempre a partir del Excel (LibreOffice) para garantizar fidelidad visual.
   */
  async exportProforma(
    idProforma: string,
    format: ExportFormat = 'both',
  ): Promise<ProformaExportResult> {
    const proforma = await this.proformasService.findOne(idProforma);

    const result: ProformaExportResult = {
      idProforma: proforma.idProforma,
      nombreProyecto: proforma.nombreProyecto,
      exportDirectory: getExportsDirectory(),
      status: proforma.status,
    };

    const needsExcel = format === 'excel' || format === 'both' || format === 'pdf';
    let excelPath: string | undefined;

    if (needsExcel) {
      const excel = await this.excelExportService.export(proforma);
      excelPath = excel.absolutePath;
      if (format === 'excel' || format === 'both') {
        result.excel = excel;
      }
    }

    if (format === 'pdf' || format === 'both') {
      result.pdf = await this.pdfExportService.exportFromExcel(
        excelPath!,
        proforma,
      );
    }

    await this.proformasService.markAsExported(idProforma);
    result.status = ProformaStatus.EXPORTED;

    return result;
  }
}
