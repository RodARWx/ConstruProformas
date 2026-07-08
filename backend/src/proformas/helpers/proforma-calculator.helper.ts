import { CreateProformaDetailDto } from '../dto/create-proforma-detail.dto';

/** Resultado del recálculo estricto de una línea de detalle */
export interface CalculatedDetailLine extends CreateProformaDetailDto {
  total: number;
  descuentoLinea: number;
  subtotalConDescuentoLinea: number;
  ivaLinea: number;
  porcentajeDescuentoTotal: number;
}

/** Totales recalculados del documento completo */
export interface CalculatedProformaTotals {
  detalles: CalculatedDetailLine[];
  subtotal: number;
  descuentoTotal: number;
  descuentoPorcentajeEfectivo: number;
  subtotalConDescuento: number;
  iva: number;
  totalGeneral: number;
  montoContrato: number;
  tiempoEjecucion: string;
}

export interface CalculateProformaTotalsOptions {
  customerDiscountPercentage?: number;
  rubroDiscountByCodigo?: Record<string, number>;
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
 * - subtotal línea = cantidad × costoUnitario
 * - descuento = subtotal × (descuentoCliente + descuentoRubro) / 100
 * - subtotalConDescuento = subtotal - descuento
 * - ivaLinea = subtotalConDescuento × (ivaPercentage / 100)
 * - subtotal documento = Σ subtotal línea (sin IVA, antes de descuento)
 * - descuentoTotal = Σ descuento línea
 * - subtotalConDescuento documento = Σ subtotalConDescuento línea
 * - iva = Σ ivaLinea
 * - totalGeneral = subtotalConDescuento + iva
 * - montoContrato = totalGeneral
 * - tiempoEjecucion = Σ diasLaborables (como texto)
 *
 * Los totales enviados por el cliente se ignoran por completo.
 */
export function calculateProformaTotals(
  detalles: CreateProformaDetailDto[],
  options: CalculateProformaTotalsOptions = {},
): CalculatedProformaTotals {
  const customerDiscount = options.customerDiscountPercentage ?? 0;
  const rubroDiscountByCodigo = options.rubroDiscountByCodigo ?? {};

  const calculatedDetails: CalculatedDetailLine[] = detalles.map((linea) => {
    const esCategoria = linea.esCategoria === true;

    if (esCategoria) {
      return {
        ...linea,
        esCategoria: true,
        total: 0,
        descuentoLinea: 0,
        subtotalConDescuentoLinea: 0,
        ivaLinea: 0,
        porcentajeDescuentoTotal: 0,
      };
    }

    const codigo = linea.codigo?.trim() ?? '';
    const rubroDiscount = rubroDiscountByCodigo[codigo] ?? 0;
    const porcentajeDescuentoTotal = customerDiscount + rubroDiscount;

    const subtotalLinea = roundMoney(linea.cantidad * linea.costoUnitario);
    const descuentoLinea = roundMoney(
      subtotalLinea * (porcentajeDescuentoTotal / 100),
    );
    const subtotalConDescuentoLinea = roundMoney(subtotalLinea - descuentoLinea);
    const ivaLinea = roundMoney(
      subtotalConDescuentoLinea * (linea.ivaPercentage / 100),
    );

    return {
      ...linea,
      esCategoria: false,
      total: subtotalLinea,
      descuentoLinea,
      subtotalConDescuentoLinea,
      ivaLinea,
      porcentajeDescuentoTotal,
    };
  });

  const rubros = calculatedDetails.filter((linea) => !linea.esCategoria);

  const subtotal = roundMoney(
    rubros.reduce((sum, linea) => sum + linea.total, 0),
  );

  const descuentoTotal = roundMoney(
    rubros.reduce((sum, linea) => sum + linea.descuentoLinea, 0),
  );

  const subtotalConDescuento = roundMoney(
    rubros.reduce((sum, linea) => sum + linea.subtotalConDescuentoLinea, 0),
  );

  const iva = roundMoney(
    rubros.reduce((sum, linea) => sum + linea.ivaLinea, 0),
  );

  const totalGeneral = roundMoney(subtotalConDescuento + iva);
  const montoContrato = totalGeneral;
  const descuentoPorcentajeEfectivo =
    subtotal > 0 ? roundMoney((descuentoTotal / subtotal) * 100) : 0;
  const tiempoEjecucion = String(
    rubros.reduce((sum, linea) => sum + linea.diasLaborables, 0),
  );

  return {
    detalles: calculatedDetails,
    subtotal,
    descuentoTotal,
    descuentoPorcentajeEfectivo,
    subtotalConDescuento,
    iva,
    totalGeneral,
    montoContrato,
    tiempoEjecucion,
  };
}
