import { CreateProformaDetailDto } from '../dto/create-proforma-detail.dto';

/** Resultado del recálculo estricto de una línea de detalle */
export interface CalculatedDetailLine extends CreateProformaDetailDto {
  total: number;
  ivaLinea: number;
}

/** Totales recalculados del documento completo */
export interface CalculatedProformaTotals {
  detalles: CalculatedDetailLine[];
  subtotal: number;
  iva: number;
  totalGeneral: number;
  montoContrato: number;
  tiempoEjecucion: string;
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
 * - total línea = cantidad × costoUnitario
 * - ivaLinea = total línea × (ivaPercentage / 100)
 * - subtotal = Σ total línea (sin IVA)
 * - iva = Σ ivaLinea
 * - totalGeneral = subtotal + iva
 * - montoContrato = totalGeneral
 * - tiempoEjecucion = Σ diasLaborables (como texto)
 *
 * Los totales enviados por el cliente se ignoran por completo.
 */
export function calculateProformaTotals(
  detalles: CreateProformaDetailDto[],
): CalculatedProformaTotals {
  const calculatedDetails: CalculatedDetailLine[] = detalles.map((linea) => {
    const total = roundMoney(linea.cantidad * linea.costoUnitario);
    const ivaLinea = roundMoney(total * (linea.ivaPercentage / 100));

    return { ...linea, total, ivaLinea };
  });

  const subtotal = roundMoney(
    calculatedDetails.reduce((sum, linea) => sum + linea.total, 0),
  );

  const iva = roundMoney(
    calculatedDetails.reduce((sum, linea) => sum + linea.ivaLinea, 0),
  );

  const totalGeneral = roundMoney(subtotal + iva);
  const montoContrato = totalGeneral;
  const tiempoEjecucion = String(
    calculatedDetails.reduce((sum, linea) => sum + linea.diasLaborables, 0),
  );

  return {
    detalles: calculatedDetails,
    subtotal,
    iva,
    totalGeneral,
    montoContrato,
    tiempoEjecucion,
  };
}
