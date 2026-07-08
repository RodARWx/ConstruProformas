import { Injectable } from '@nestjs/common';
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
import { getExportsDirectory } from '../helpers/storage-path.helper';
import { roundMoney } from '../../proformas/helpers/proforma-calculator.helper';

@Injectable()
export class ProformaExcelExportService {
  constructor(private readonly catalogService: CatalogService) {}

  async prepareForExport(proforma: Proforma): Promise<Proforma> {
    const { items: catalog } = await this.catalogService.findAll();
    const codigoToCategoria = buildCodigoCategoriaMap(catalog);
    return prepareProformaForExport(proforma, codigoToCategoria);
  }

  async export(proforma: Proforma): Promise<ExportedFileInfo> {
    const prepared = await this.prepareForExport(proforma);

    // --- Derivar descuento de forma directa y limpia ---
    const descuentoTotal = Math.max(
      0,
      roundMoney(prepared.subtotal - (prepared.totalGeneral - prepared.iva)),
    );
    const descuentoPorcentaje =
      prepared.subtotal > 0 ? (descuentoTotal / prepared.subtotal) * 100 : 0;

    const filename = buildExportFilename(
      prepared.idProforma,
      prepared.nombreProyecto,
      'xlsx',
    );
    const absolutePath = join(getExportsDirectory(), filename);

    const { workbook } = await buildProformaWorkbook(prepared, descuentoTotal, descuentoPorcentaje);
    await workbook.xlsx.writeFile(absolutePath);

    return {
      filename,
      absolutePath,
      relativePath: join('exports', filename),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  getExpectedXlsxPath(proforma: Proforma): string {
    const filename = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'xlsx',
    );
    return join(getExportsDirectory(), filename);
  }
}