import { CreateProformaDetailDto } from '../dto/create-proforma-detail.dto';

/** Resultado del recálculo estricto de una línea de detalle */
export interface CalculatedDetailLine extends CreateProformaDetailDto {
  total: number;
}

/** Totales recalculados del documento completo */
export interface CalculatedProformaTotals {
  detalles: CalculatedDetailLine[];
  subtotal: number;
  iva: number;
  totalGeneral: number;
}

/**
 * Redondea un valor monetario a 2 decimales para evitar
 * errores de precisión de punto flotante en SQLite.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Recorre el arreglo de rubros y recalcula de forma estricta:
 * - total por línea = cantidad * costoUnitario
 * - subtotal = suma de totales de línea
 * - iva = subtotal * tasa (solo si appliesIva es true)
 * - totalGeneral = subtotal + iva
 *
 * Los totales enviados por el cliente se ignoran por completo.
 */
export function calculateProformaTotals(
  detalles: CreateProformaDetailDto[],
  appliesIva: boolean,
  ivaRate: number,
): CalculatedProformaTotals {
  const calculatedDetails: CalculatedDetailLine[] = detalles.map((linea) => {
    if (linea.esCategoria) {
      return {
        ...linea,
        unidad: linea.unidad ?? '',
        cantidad: linea.cantidad ?? 0,
        costoUnitario: linea.costoUnitario ?? 0,
        total: 0,
      };
    }

    const total = roundMoney(
      (linea.cantidad ?? 0) * (linea.costoUnitario ?? 0),
    );
    return {
      ...linea,
      cantidad: linea.cantidad ?? 0,
      costoUnitario: linea.costoUnitario ?? 0,
      unidad: linea.unidad ?? '',
      total,
    };
  });

  const subtotal = roundMoney(
    calculatedDetails
      .filter((linea) => !linea.esCategoria)
      .reduce((sum, linea) => sum + linea.total, 0),
  );

  const iva = appliesIva ? roundMoney(subtotal * ivaRate) : 0;
  const totalGeneral = roundMoney(subtotal + iva);

  return {
    detalles: calculatedDetails,
    subtotal,
    iva,
    totalGeneral,
  };
}
