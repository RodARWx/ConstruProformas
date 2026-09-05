import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';
import {
  buildProformaFolderPath,
  isProformaFile,
  listProformaFiles,
  ProformaFileEntry,
} from './helpers/storage-path.helper';

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.pdf']);

@Injectable()
export class ExportDownloadService {
  /**
   * Valida el nombre de archivo y resuelve la ruta física dentro de la carpeta
   * de la proforma en el NAS.
   * Rechaza path traversal (../), extensiones no permitidas y archivos que no correspondan al ID.
   */
  async resolveProformaFile(
    idProforma: string,
    nombreProyecto: string,
    filename: string,
  ): Promise<{
    absolutePath: string;
    mimeType: string;
    safeFilename: string;
  } | null> {
    const safeFilename = basename(filename.trim());
    if (!safeFilename || safeFilename !== filename.trim()) {
      throw new BadRequestException('Nombre de archivo inválido');
    }

    if (!isProformaFile(safeFilename, idProforma)) {
      throw new BadRequestException(
        `El archivo "${safeFilename}" no corresponde a la proforma ${idProforma}`,
      );
    }

    const extension = extname(safeFilename).toLowerCase();

    const folderPath = buildProformaFolderPath(idProforma, nombreProyecto);
    let absolutePath = join(folderPath, safeFilename);

    if (!existsSync(absolutePath)) {
      const { getExportsDirectory } = await import('./helpers/storage-path.helper');
      const legacyPath = join(getExportsDirectory(), safeFilename);
      if (existsSync(legacyPath)) {
        absolutePath = legacyPath;
      } else {
        return null;
      }
    }

    const mimeType =
      extension === '.pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return { absolutePath, mimeType, safeFilename };
  }

  /**
   * Lista todos los archivos existentes en la carpeta de una proforma.
   * Devuelve array vacío si la carpeta no existe aún.
   */
  listFiles(
    idProforma: string,
    nombreProyecto: string,
  ): ProformaFileEntry[] {
    return listProformaFiles(idProforma, nombreProyecto);
  }

  /**
   * Compatibilidad con descargas legacy (directorio plano data/exports/).
   * Se conserva para archivos exportados antes de la Fase 2.
   */
  async resolveLegacyExportFile(filename: string): Promise<{
    absolutePath: string;
    mimeType: string;
    safeFilename: string;
  } | null> {
    const safeFilename = basename(filename.trim());
    if (!safeFilename || safeFilename !== filename.trim()) {
      throw new BadRequestException('Nombre de archivo inválido');
    }

    const extension = extname(safeFilename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Solo se permiten archivos .xlsx o .pdf');
    }

    const { getExportsDirectory } = await import('./helpers/storage-path.helper');
    const absolutePath = join(getExportsDirectory(), safeFilename);
    if (!existsSync(absolutePath)) {
      return null;
    }

    const mimeType =
      extension === '.pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return { absolutePath, mimeType, safeFilename };
  }
}
