import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { getExportsDirectory } from './helpers/storage-path.helper';

@Controller('export')
export class ExportController {
  /**
   * Descarga un archivo generado (PDF o Excel) desde el directorio de exports.
   * Ejemplo: GET /api/export/download/CM-PROF-3%20-%20Proyecto.xlsx
   */
  @Get('download/:filename')
  downloadFile(@Param('filename') filename: string, @Res() res: Response): void {
    const filePath = join(getExportsDirectory(), filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Archivo ${filename} no encontrado`);
    }
    res.download(filePath);
  }
}