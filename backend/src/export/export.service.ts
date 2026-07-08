import { Injectable, Inject, forwardRef } from '@nestjs/common';
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
    @Inject(forwardRef(() => ProformasService)) // ✅ AÑADIR ESTO
    private readonly proformasService: ProformasService,
    private readonly excelExportService: ProformaExcelExportService,
    private readonly pdfExportService: ProformaPdfExportService,
  ) {}

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

    let xlsxPath: string | undefined;

    if (format === 'excel' || format === 'both') {
      result.excel = await this.excelExportService.export(proforma);
      xlsxPath = result.excel.absolutePath;
    }

    if (format === 'pdf' || format === 'both') {
      if (!xlsxPath) {
        result.excel = await this.excelExportService.export(proforma);
        xlsxPath = result.excel.absolutePath;
      }

      result.pdf = await this.pdfExportService.exportFromXlsx(proforma, xlsxPath);

      if (format === 'pdf' && result.excel) {
        delete result.excel;
      }
    }

    await this.proformasService.markAsExported(idProforma);
    result.status = ProformaStatus.EXPORTED;

    return result;
  }
}