import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ProformasModule } from '../proformas/proformas.module';
import { ExportService } from './export.service';
import { ProformaExportController } from './proforma-export.controller';
import { ProformaExcelExportService } from './services/proforma-excel-export.service';
import { ProformaHtmlPdfService } from './services/proforma-html-pdf.service';
import { ProformaPdfExportService } from './services/proforma-pdf-export.service';

@Module({
  imports: [ProformasModule, CatalogModule],
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
