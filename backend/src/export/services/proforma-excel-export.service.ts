import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { CatalogService } from '../../catalog/catalog.service';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ExportedFileInfo } from '../dto/export-result.dto';
import { buildExportFilename } from '../helpers/filename.helper';
import { buildProformaWorkbook } from '../helpers/proforma-excel-builder.helper';
import {
  buildCodigoCategoriaMap,
  prepareProformaForExport,
} from '../helpers/proforma-export-details.helper';
import {
  ensureProformaFolder,
  resolveVersionedFilename,
} from '../helpers/storage-path.helper';

@Injectable()
export class ProformaExcelExportService {
  constructor(private readonly catalogService: CatalogService) {}

  /** Enriquece la proforma con filas de categoría según el catálogo. */
  async prepareForExport(proforma: Proforma): Promise<Proforma> {
    const { items: catalog } = await this.catalogService.findAll();
    const codigoToCategoria = buildCodigoCategoriaMap(catalog);
    return prepareProformaForExport(proforma, codigoToCategoria);
  }

  /**
   * Genera el .xlsx institucional y lo guarda en la carpeta de la proforma en el NAS.
   *
   * Versionado inteligente: si el archivo ya existe se crea _V2.xlsx, _V3.xlsx, etc.
   * Si la proforma no ha cambiado y el archivo ya existe, el caller puede optar por
   * no invocar este método y servir el archivo existente directamente.
   */
  async export(proforma: Proforma, targetVersion?: number): Promise<ExportedFileInfo> {
    const prepared = await this.prepareForExport(proforma);

    const folderPath = ensureProformaFolder(
      prepared.idProforma,
      prepared.nombreProyecto,
    );

    const baseFilename = buildExportFilename(
      prepared.idProforma,
      prepared.nombreProyecto,
      'xlsx',
    );

    const filename = resolveVersionedFilename(
      folderPath,
      baseFilename,
      targetVersion,
      prepared.idProforma,
    );
    const absolutePath = join(folderPath, filename);

    const { workbook } = await buildProformaWorkbook(prepared);
    await workbook.xlsx.writeFile(absolutePath);

    return {
      filename,
      absolutePath,
      folderPath,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Devuelve la ruta donde estaría el Excel base (sin versión) de esta proforma.
   * Útil para comprobar si ya existe un archivo antes de volver a generarlo.
   */
  getExpectedXlsxPath(proforma: Proforma): string {
    const { buildProformaFolderPath } = require('../helpers/storage-path.helper');
    const folderPath = buildProformaFolderPath(
      proforma.idProforma,
      proforma.nombreProyecto,
    );
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'xlsx',
    );
    return join(folderPath, filename);
  }

  /**
   * Retorna la ruta del Excel base solo si ya existe en disco (no genera nada).
   * Usado por el servicio de exportación para no re-generar si no hubo cambios.
   */
  findExistingXlsx(proforma: Proforma): string | null {
    const path = this.getExpectedXlsxPath(proforma);
    return existsSync(path) ? path : null;
  }
}
