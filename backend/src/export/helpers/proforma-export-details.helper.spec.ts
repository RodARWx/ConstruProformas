import {
  buildCodigoCategoriaMap,
  expandDetallesWithCategories,
} from './proforma-export-details.helper';
import { ProformaDetail } from '../../proformas/entities/proforma-detail.entity';

describe('proforma-export-details.helper', () => {
  const rubro = (
    partial: Partial<ProformaDetail> & Pick<ProformaDetail, 'descripcion'>,
  ): ProformaDetail =>
    ({
      id: 1,
      codigo: 'A001',
      tiempo: null,
      unidad: 'u',
      cantidad: 1,
      costoUnitario: 100,
      total: 100,
      diasLaborables: 1,
      ivaPercentage: 15,
      esCategoria: false,
      proformaId: 'TEST',
      proforma: {} as never,
      ...partial,
    }) as ProformaDetail;

  it('inserta filas de categoría según el catálogo cuando no vienen en la proforma', () => {
    const detalles = [
      rubro({ codigo: '025', descripcion: 'Asesoría' }),
      rubro({ codigo: '026', descripcion: 'Otra asesoría' }),
      rubro({ codigo: '101', descripcion: 'Topografía' }),
    ];

    const map = buildCodigoCategoriaMap([
      {
        codigoSugerido: '025',
        categoriaNombre: 'ELABORACIONES',
      } as never,
      {
        codigoSugerido: '026',
        categoriaNombre: 'ELABORACIONES',
      } as never,
      {
        codigoSugerido: '101',
        categoriaNombre: 'TOPOGRAFIA',
      } as never,
    ]);

    const expanded = expandDetallesWithCategories(detalles, map);

    expect(expanded).toHaveLength(5);
    expect(expanded[0].esCategoria).toBe(true);
    expect(expanded[0].descripcion).toBe('ELABORACIONES');
    expect(expanded[3].esCategoria).toBe(true);
    expect(expanded[3].descripcion).toBe('TOPOGRAFIA');
  });
});
