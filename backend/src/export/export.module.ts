import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ProformasModule } from '../proformas/proformas.module';
import { ExportDownloadController } from './export-download.controller';
import { ExportDownloadService } from './export-download.service';
import { ExportService } from './export.service';
import { ProformaExportController } from './proforma-export.controller';
import { ProformaExcelExportService } from './services/proforma-excel-export.service';
import { ProformaHtmlPdfService } from './services/proforma-html-pdf.service';
import { ProformaPdfExportService } from './services/proforma-pdf-export.service';

@Module({
  imports: [forwardRef(() => ProformasModule), CatalogModule],
  controllers: [ProformaExportController, ExportDownloadController],
  providers: [
    ExportService,
    ExportDownloadService,
    ProformaExcelExportService,
    ProformaPdfExportService,
    ProformaHtmlPdfService,
  ],
  exports: [ExportService],
})
export class ExportModule {}
