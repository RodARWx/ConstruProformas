import { Module } from '@nestjs/common';
import { ProformasModule } from '../proformas/proformas.module';
import { ExportService } from './export.service';
import { ProformaExportController } from './proforma-export.controller';
import { ProformaExcelExportService } from './services/proforma-excel-export.service';
import { ProformaPdfExportService } from './services/proforma-pdf-export.service';
import { ProformaHtmlPdfService } from './services/proforma-html-pdf.service';

@Module({
  imports: [ProformasModule],
  controllers: [ProformaExportController],
  providers: [
    ExportService,
    ProformaExcelExportService,
    ProformaPdfExportService,
    ProformaHtmlPdfService,
  ],
  exports: [ExportService],
})
export class ExportModule {}
