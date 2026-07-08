import {
  calculateProformaTotals,
  roundMoney,
} from './proforma-calculator.helper';
import { CreateProformaDetailDto } from '../dto/create-proforma-detail.dto';

describe('proforma-calculator.helper', () => {
  const rubroBase: CreateProformaDetailDto = {
    descripcion: 'Excavación manual',
    unidad: 'm³',
    cantidad: 10,
    costoUnitario: 25.5,
    diasLaborables: 2,
    ivaPercentage: 15,
  };

  describe('roundMoney', () => {
    it('redondea a 2 decimales evitando errores de punto flotante', () => {
      expect(roundMoney(10.005)).toBe(10.01);
      expect(roundMoney(10.004)).toBe(10);
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    });
  });

  describe('calculateProformaTotals', () => {
    it('calcula correctamente la multiplicación y redondeo por línea de rubro', () => {
      const result = calculateProformaTotals([rubroBase]);

      expect(result.detalles).toHaveLength(1);
      expect(result.detalles[0].total).toBe(255);
      expect(result.detalles[0].ivaLinea).toBe(38.25);
      expect(result.detalles[0].cantidad).toBe(10);
      expect(result.detalles[0].costoUnitario).toBe(25.5);
    });

    it('suma de forma íntegra el subtotal a partir de todas las líneas', () => {
      const detalles: CreateProformaDetailDto[] = [
        {
          descripcion: 'Rubro A',
          unidad: 'm³',
          cantidad: 5,
          costoUnitario: 20,
          diasLaborables: 1,
          ivaPercentage: 15,
        },
        {
          descripcion: 'Rubro B',
          unidad: 'm²',
          cantidad: 3,
          costoUnitario: 15.5,
          diasLaborables: 2,
          ivaPercentage: 15,
        },
        {
          descripcion: 'Rubro C',
          unidad: 'u',
          cantidad: 2,
          costoUnitario: 100,
          diasLaborables: 3,
          ivaPercentage: 15,
        },
      ];

      const result = calculateProformaTotals(detalles);
      const sumaManual = result.detalles.reduce((acc, linea) => acc + linea.total, 0);

      expect(result.subtotal).toBe(roundMoney(sumaManual));
      expect(result.subtotal).toBe(346.5);
    });

    it('calcula IVA distinto por cada línea y suma el ivaTotal', () => {
      const detalles: CreateProformaDetailDto[] = [
        {
          descripcion: 'Rubro con 15%',
          unidad: 'm³',
          cantidad: 10,
          costoUnitario: 100,
          diasLaborables: 1,
          ivaPercentage: 15,
        },
        {
          descripcion: 'Rubro con 5%',
          unidad: 'm²',
          cantidad: 4,
          costoUnitario: 50,
          diasLaborables: 1,
          ivaPercentage: 5,
        },
      ];

      const result = calculateProformaTotals(detalles);

      expect(result.detalles[0].total).toBe(1000);
      expect(result.detalles[0].ivaLinea).toBe(150);
      expect(result.detalles[1].total).toBe(200);
      expect(result.detalles[1].ivaLinea).toBe(10);
      expect(result.subtotal).toBe(1200);
      expect(result.iva).toBe(160);
      expect(result.totalGeneral).toBe(1360);
      expect(result.montoContrato).toBe(1360);
    });

    it('permite líneas con 0% de IVA sin afectar negativamente el total', () => {
      const detalles: CreateProformaDetailDto[] = [
        {
          descripcion: 'Rubro gravado',
          unidad: 'm³',
          cantidad: 10,
          costoUnitario: 100,
          diasLaborables: 2,
          ivaPercentage: 15,
        },
        {
          descripcion: 'Rubro exento',
          unidad: 'm²',
          cantidad: 5,
          costoUnitario: 50,
          diasLaborables: 3,
          ivaPercentage: 0,
        },
      ];

      const result = calculateProformaTotals(detalles);

      expect(result.detalles[0].ivaLinea).toBe(150);
      expect(result.detalles[1].ivaLinea).toBe(0);
      expect(result.subtotal).toBe(1250);
      expect(result.iva).toBe(150);
      expect(result.totalGeneral).toBe(1400);
      expect(result.montoContrato).toBe(result.totalGeneral);
    });

    it('calcula tiempoEjecucion como suma de diasLaborables de todas las líneas', () => {
      const detalles: CreateProformaDetailDto[] = [
        { ...rubroBase, diasLaborables: 4 },
        {
          descripcion: 'Replanteo',
          unidad: 'u',
          cantidad: 1,
          costoUnitario: 120,
          diasLaborables: 6,
          ivaPercentage: 15,
        },
      ];

      const result = calculateProformaTotals(detalles);

      expect(result.tiempoEjecucion).toBe('10');
    });

    it('establece montoContrato igual al total con IVA', () => {
      const result = calculateProformaTotals([rubroBase]);

      expect(result.subtotal).toBe(255);
      expect(result.iva).toBe(38.25);
      expect(result.totalGeneral).toBe(293.25);
      expect(result.montoContrato).toBe(293.25);
    });

    it('excluye filas de categoría de subtotal, IVA y días', () => {
      const detalles: CreateProformaDetailDto[] = [
        {
          descripcion: 'TOPOGRAFÍA',
          unidad: '-',
          cantidad: 0,
          costoUnitario: 0,
          diasLaborables: 99,
          ivaPercentage: 0,
          esCategoria: true,
        },
        {
          descripcion: 'Rubro real',
          unidad: 'u',
          cantidad: 2,
          costoUnitario: 100,
          diasLaborables: 5,
          ivaPercentage: 15,
        },
      ];

      const result = calculateProformaTotals(detalles);

      expect(result.subtotal).toBe(200);
      expect(result.descuentoTotal).toBe(0);
      expect(result.subtotalConDescuento).toBe(200);
      expect(result.iva).toBe(30);
      expect(result.totalGeneral).toBe(230);
      expect(result.tiempoEjecucion).toBe('5');
      expect(result.detalles[0].total).toBe(0);
      expect(result.detalles[0].ivaLinea).toBe(0);
    });

    it('aplica descuento cliente + rubro antes del IVA', () => {
      const detalles: CreateProformaDetailDto[] = [
        {
          codigo: 'R-01',
          descripcion: 'Rubro con descuento',
          unidad: 'u',
          cantidad: 10,
          costoUnitario: 100,
          diasLaborables: 1,
          ivaPercentage: 15,
        },
      ];

      const result = calculateProformaTotals(detalles, {
        customerDiscountPercentage: 5,
        rubroDiscountByCodigo: { 'R-01': 10 },
      });

      expect(result.subtotal).toBe(1000);
      expect(result.descuentoTotal).toBe(150);
      expect(result.descuentoPorcentajeEfectivo).toBe(15);
      expect(result.subtotalConDescuento).toBe(850);
      expect(result.detalles[0].ivaLinea).toBe(127.5);
      expect(result.iva).toBe(127.5);
      expect(result.totalGeneral).toBe(977.5);
      expect(result.montoContrato).toBe(977.5);
    });

    it('con descuentos en 0 se comporta igual que antes', () => {
      const result = calculateProformaTotals([rubroBase]);

      expect(result.subtotal).toBe(255);
      expect(result.descuentoTotal).toBe(0);
      expect(result.subtotalConDescuento).toBe(255);
      expect(result.iva).toBe(38.25);
      expect(result.totalGeneral).toBe(293.25);
    });
  });
});
