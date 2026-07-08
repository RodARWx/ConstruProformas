import * as ExcelJS from 'exceljs';
import { ProformaDetail } from '../../proformas/entities/proforma-detail.entity';
import { buildDynamicItemRows, buildTotalsBlock } from './proforma-excel-layout.helper';

function createDetail(partial: Partial<ProformaDetail> & Pick<ProformaDetail, 'descripcion'>): ProformaDetail {
  return {
    id: 1,
    codigo: partial.codigo ?? null,
    descripcion: partial.descripcion,
    tiempo: partial.tiempo ?? null,
    unidad: partial.unidad ?? 'u',
    cantidad: partial.cantidad ?? 0,
    costoUnitario: partial.costoUnitario ?? 0,
    total: partial.total ?? 0,
    diasLaborables: partial.diasLaborables ?? 1,
    ivaPercentage: partial.ivaPercentage ?? 15,
    esCategoria: partial.esCategoria ?? false,
    proformaId: 'TEST',
    proforma: {} as never,
  };
}

describe('proforma-excel-layout.helper', () => {
  it('escribe filas de categoría con merge A:G y excluye de rubroRows', () => {
    const sheet = new ExcelJS.Workbook().addWorksheet('TEST');
    const detalles = [
      createDetail({ descripcion: 'TOPOGRAFÍA', esCategoria: true, unidad: '-' }),
      createDetail({
        descripcion: 'Rubro A',
        codigo: 'A1',
        cantidad: 2,
        costoUnitario: 100,
        total: 200,
        diasLaborables: 3,
      }),
    ];

    const layout = buildDynamicItemRows(sheet, detalles, 13);

    expect(layout.rubroRows).toEqual([14]);
    expect(sheet.getCell('A13').value).toBe('TOPOGRAFÍA');
    expect(sheet.getCell('G14').value).toEqual({ formula: 'E14*F14' });
  });

  it('genera fórmulas SUM en totales para rubros únicamente', () => {
    const sheet = new ExcelJS.Workbook().addWorksheet('TEST');
    const detalles = [
      createDetail({ descripcion: 'CATEGORÍA', esCategoria: true }),
      createDetail({
        descripcion: 'Rubro 1',
        cantidad: 1,
        costoUnitario: 100,
        total: 100,
        diasLaborables: 4,
      }),
      createDetail({
        descripcion: 'Rubro 2',
        cantidad: 2,
        costoUnitario: 50,
        total: 100,
        diasLaborables: 8,
      }),
    ];

    const layout = buildDynamicItemRows(sheet, detalles, 13);
    buildTotalsBlock(
      sheet,
      {
        iva: 30,
        subtotal: 200,
        totalGeneral: 230,
      } as never,
      layout,
    );

    const subtotalCell = sheet.getCell(`G${layout.totalsStartRow + 1}`);
    expect(subtotalCell.value).toEqual({ formula: 'SUM(G14,G15)' });

    const diasCell = sheet.getCell(`G${layout.totalsStartRow}`);
    expect(diasCell.value).toEqual({ formula: 'SUM(C14,C15)' });
  });

  it('genera fórmulas y valores de descuento en totales cuando se aplica descuento', () => {
    const sheet = new ExcelJS.Workbook().addWorksheet('TEST');
    const detalles = [
      createDetail({
        descripcion: 'Rubro 1',
        cantidad: 2,
        costoUnitario: 100,
        total: 200,
        diasLaborables: 3,
      }),
    ];

    const layout = buildDynamicItemRows(sheet, detalles, 13);
    buildTotalsBlock(
      sheet,
      {
        iva: 15,
        subtotal: 200,
        totalGeneral: 195, // 200 - 20 (descuento) + 15 (iva)
      } as never,
      layout,
      20, // descuentoTotal
      10, // descuentoPorcentaje
    );

    const subtotalRow = layout.totalsStartRow + 1;
    const descuentoRow = subtotalRow + 1;
    const subtotalConDescuentoRow = descuentoRow + 1;
    const ivaRow = subtotalConDescuentoRow + 1;
    const totalRow = ivaRow + 1;

    // Verificar valor del descuento (debe ser negativo)
    const descuentoCell = sheet.getCell(`G${descuentoRow}`);
    expect(descuentoCell.value).toBe(-20);

    // Verificar fórmula de subtotal con descuento (debe sumar la celda de descuento que es negativa)
    const subtotalConDescuentoCell = sheet.getCell(`G${subtotalConDescuentoRow}`);
    expect(subtotalConDescuentoCell.value).toEqual({
      formula: `G${subtotalRow}+G${descuentoRow}`,
    });

    // Verificar fórmula del total
    const totalCell = sheet.getCell(`G${totalRow}`);
    expect(totalCell.value).toEqual({
      formula: `G${subtotalConDescuentoRow}+G${ivaRow}`,
    });
  });
});
