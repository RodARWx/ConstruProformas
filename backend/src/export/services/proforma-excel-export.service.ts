import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { join } from 'path';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { REPORT_IMAGE_ANCHORS } from '../constants/institutional.constants';
import { readLogoBuffer } from '../helpers/asset-path.helper';
import { areBrandFontsAvailable } from '../helpers/brand-fonts.helper';
import { buildProformaWorkbook } from '../helpers/proforma-excel-builder.helper';
import {
  buildProformaValidationUrl,
  generateQrCodeBuffer,
} from '../helpers/qr-code.helper';
import { buildExportFilename } from '../helpers/filename.helper';
import { getExportsDirectory } from '../helpers/storage-path.helper';
import { ExportedFileInfo } from '../dto/export-result.dto';

@Injectable()
export class ProformaExcelExportService implements OnModuleInit {
  private readonly logger = new Logger(ProformaExcelExportService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (!areBrandFontsAvailable()) {
      this.logger.warn(
        'Fuentes Gotham no encontradas en assets/fonts/. ' +
          'Coloque Gotham-Black.otf y Gotham-Book.otf para exportación corporativa. ' +
          'En móvil/PWA el PDF seguirá usando Arial como fallback.',
      );
    }
  }

  async export(proforma: Proforma): Promise<ExportedFileInfo> {
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'xlsx',
    );
    const absolutePath = join(getExportsDirectory(), filename);
    const ivaRate = Number(this.configService.get<string>('IVA_RATE', '0.15'));

    const { workbook, sheet, contactRow } = buildProformaWorkbook(
      proforma,
      ivaRate,
    );

    await this.embedImages(workbook, sheet, proforma, contactRow);
    await workbook.xlsx.writeFile(absolutePath);

    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async embedImages(
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    proforma: Proforma,
    contactRow: number,
  ): Promise<void> {
    const validationUrl = buildProformaValidationUrl(proforma.idProforma);
    const qrBuffer = await generateQrCodeBuffer(validationUrl, 120);

    const qrImageId = workbook.addImage({
      buffer: qrBuffer as unknown as ExcelJS.Buffer,
      extension: 'png',
    });

    sheet.addImage(qrImageId, {
      tl: {
        col: REPORT_IMAGE_ANCHORS.qr.col,
        row: contactRow - REPORT_IMAGE_ANCHORS.qrOffsetFromContact,
      },
      ext: {
        width: REPORT_IMAGE_ANCHORS.qr.width,
        height: REPORT_IMAGE_ANCHORS.qr.height,
      },
    });

    const logoBuffer = readLogoBuffer();
    if (!logoBuffer) {
      return;
    }

    const logoImageId = workbook.addImage({
      buffer: logoBuffer as unknown as ExcelJS.Buffer,
      extension: 'png',
    });

    sheet.addImage(logoImageId, {
      tl: { col: 5.35, row: 0.18 },
      ext: { width: 158, height: 52 },
    });
  }
}
