import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { ProformasService } from '../proformas/proformas.service';
import { ExportDownloadService } from './export-download.service';
import { ProformaFileEntry } from './helpers/storage-path.helper';

@Controller('proformas')
export class ExportDownloadController {
  constructor(
    private readonly exportDownloadService: ExportDownloadService,
    private readonly proformasService: ProformasService,
  ) {}

  /**
   * Lista todos los archivos existentes en la carpeta de una proforma.
   * GET /proformas/:id/archivos
   * Responde con array de { filename, extension, sizeBytes, modifiedAt }
   */
  @Get(':id/archivos')
  async listFiles(@Param('id') id: string): Promise<ProformaFileEntry[]> {
    const proforma = await this.proformasService.findOne(id);
    return this.exportDownloadService.listFiles(
      proforma.idProforma,
      proforma.nombreProyecto,
    );
  }

  /**
   * Abre un archivo específico de la proforma.
   * - PDF → Content-Disposition: inline  → se abre en nueva pestaña del navegador.
   * - Excel → Content-Disposition: attachment → se descarga directamente.
   *
   * GET /proformas/:id/archivos/:filename
   */
  @Get(':id/archivos/:filename')
  async serveFile(
    @Param('id') id: string,
    @Param('filename') filename: string,
  ): Promise<StreamableFile> {
    const proforma = await this.proformasService.findOne(id);

    const file = await this.exportDownloadService.resolveProformaFile(
      proforma.idProforma,
      proforma.nombreProyecto,
      filename,
    );

    if (!file) {
      throw new NotFoundException(
        `Archivo "${filename}" no encontrado en la carpeta de la proforma`,
      );
    }

    const isPdf = file.mimeType === 'application/pdf';
    const stream = createReadStream(file.absolutePath);
    const dispositionType = isPdf ? 'inline' : 'attachment';

    return new StreamableFile(stream, {
      type: file.mimeType,
      disposition: buildContentDisposition(dispositionType, file.safeFilename),
    });
  }

  /**
   * Descarga legacy: archivos exportados antes de la Fase 2 (directorio plano).
   * GET /export/download/:filename
   * Se conserva para no romper integraciones existentes.
   */
  @Get('/export/download/:filename')
  async downloadLegacy(
    @Param('filename') filename: string,
  ): Promise<StreamableFile> {
    const file =
      await this.exportDownloadService.resolveLegacyExportFile(filename);

    if (!file) {
      throw new NotFoundException(`Archivo "${filename}" no encontrado`);
    }

    const stream = createReadStream(file.absolutePath);
    return new StreamableFile(stream, {
      type: file.mimeType,
      disposition: buildContentDisposition('attachment', file.safeFilename),
    });
  }
}

function buildContentDisposition(
  dispositionType: 'inline' | 'attachment',
  filename: string,
): string {
  const safeAscii = filename
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '');
  const utf8Encoded = encodeURIComponent(filename);
  return `${dispositionType}; filename="${safeAscii}"; filename*=UTF-8''${utf8Encoded}`;
}
