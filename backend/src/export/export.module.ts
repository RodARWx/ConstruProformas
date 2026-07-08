import { Module, forwardRef } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller'; // <-- Importar
import { ProformaExcelExportService } from './services/proforma-excel-export.service';
import { ProformaPdfExportService } from './services/proforma-pdf-export.service';
import { ProformaHtmlPdfService } from './services/proforma-html-pdf.service';
import { ProformasModule } from '../proformas/proformas.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    forwardRef(() => ProformasModule),
    CatalogModule,
  ],
  controllers: [ExportController], // <-- Agregar
  providers: [
    ExportService,
    ProformaExcelExportService,
    ProformaPdfExportService,
    ProformaHtmlPdfService,
  ],
  exports: [ExportService],
})
export class ExportModule {}