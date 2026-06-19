import { ItemCatalog } from '../../catalog/entities/item-catalog.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ProformaDetail } from '../../proformas/entities/proforma-detail.entity';

/** Mapa codigoSugerido → nombre de categoría desde el catálogo. */
export function buildCodigoCategoriaMap(
  catalog: ItemCatalog[],
): Map<string, string> {
  const map = new Map<string, string>();

  catalog.forEach((item) => {
    const codigo = item.codigoSugerido?.trim();
    const categoria = item.categoriaNombre?.trim();
    if (codigo && categoria) {
      map.set(codigo, categoria);
    }
  });

  return map;
}

function createCategoryDetail(
  nombreCategoria: string,
  proformaId: string,
): ProformaDetail {
  return {
    id: 0,
    codigo: null,
    descripcion: nombreCategoria,
    tiempo: null,
    unidad: '-',
    cantidad: 0,
    costoUnitario: 0,
    total: 0,
    diasLaborables: 0,
    ivaPercentage: 0,
    esCategoria: true,
    proformaId,
    proforma: {} as Proforma,
  };
}

/**
 * Inserta filas de categoría antes de cada grupo de rubros según el catálogo.
 * Si la proforma ya trae esCategoria explícitas, no modifica el arreglo.
 */
export function expandDetallesWithCategories(
  detalles: ProformaDetail[],
  codigoToCategoria: Map<string, string>,
): ProformaDetail[] {
  if (detalles.some((linea) => linea.esCategoria)) {
    return detalles;
  }

  const result: ProformaDetail[] = [];
  let lastCategory: string | null = null;

  detalles.forEach((linea) => {
    const codigo = linea.codigo?.trim();
    const categoria = codigo ? codigoToCategoria.get(codigo) ?? null : null;

    if (categoria && categoria !== lastCategory) {
      result.push(createCategoryDetail(categoria, linea.proformaId));
      lastCategory = categoria;
    }

    result.push(linea);
  });

  return result;
}

export function prepareProformaForExport(
  proforma: Proforma,
  codigoToCategoria: Map<string, string>,
): Proforma {
  return {
    ...proforma,
    detalles: expandDetallesWithCategories(proforma.detalles, codigoToCategoria),
  };
}
