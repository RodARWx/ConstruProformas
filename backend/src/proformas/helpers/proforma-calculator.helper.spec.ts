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
      const result = calculateProformaTotals([rubroBase], true, 0.15);

      expect(result.detalles).toHaveLength(1);
      expect(result.detalles[0].total).toBe(255);
      expect(result.detalles[0].cantidad).toBe(10);
      expect(result.detalles[0].costoUnitario).toBe(25.5);
    });

    it('suma de forma íntegra el subtotal a partir de todas las líneas', () => {
      const detalles: CreateProformaDetailDto[] = [
        { descripcion: 'Rubro A', unidad: 'm³', cantidad: 5, costoUnitario: 20 },
        { descripcion: 'Rubro B', unidad: 'm²', cantidad: 3, costoUnitario: 15.5 },
        { descripcion: 'Rubro C', unidad: 'u', cantidad: 2, costoUnitario: 100 },
      ];

      const result = calculateProformaTotals(detalles, true, 0.15);
      const sumaManual = result.detalles.reduce((acc, linea) => acc + linea.total, 0);

      expect(result.subtotal).toBe(roundMoney(sumaManual));
      expect(result.subtotal).toBe(346.5);
    });

    it('aplica IVA al 15% cuando appliesIva es verdadero', () => {
      const result = calculateProformaTotals([rubroBase], true, 0.15);

      expect(result.subtotal).toBe(255);
      expect(result.iva).toBe(38.25);
      expect(result.totalGeneral).toBe(293.25);
    });

    it('establece IVA en 0 cuando appliesIva es falso', () => {
      const result = calculateProformaTotals([rubroBase], false, 0.15);

      expect(result.subtotal).toBe(255);
      expect(result.iva).toBe(0);
      expect(result.totalGeneral).toBe(255);
      expect(result.totalGeneral).toBe(result.subtotal);
    });

    it('excluye las filas de categoría del subtotal y asigna total 0', () => {
      const detalles: CreateProformaDetailDto[] = [
        {
          esCategoria: true,
          descripcion: '2. DISEÑO VIAL',
        },
        {
          descripcion: 'Diseño geométrico',
          unidad: 'Glb',
          cantidad: 10,
          costoUnitario: 25.5,
        },
      ];

      const result = calculateProformaTotals(detalles, true, 0.15);

      expect(result.detalles[0].total).toBe(0);
      expect(result.subtotal).toBe(255);
      expect(result.iva).toBe(38.25);
      expect(result.totalGeneral).toBe(293.25);
    });
  });
});
