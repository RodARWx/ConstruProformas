import { Customer } from '../../customers/entities/customer.entity';
import { Proforma } from '../entities/proforma.entity';
import {
  applyCustomerSnapshotToProforma,
  resolveProformaCustomerSnapshot,
} from './proforma-customer-snapshot.helper';

describe('proforma-customer-snapshot.helper', () => {
  const customer = {
    id: 1,
    nombreCliente: 'Cliente Vivo S.A.',
    rucCedula: '1790000000001',
    direccion: 'Quito',
    telefono: '0999999999',
    correo: 'vivo@test.com',
  } as Customer;

  it('congela datos del cliente en la proforma', () => {
    const proforma = new Proforma();
    applyCustomerSnapshotToProforma(proforma, customer);

    expect(proforma.clienteNombre).toBe('Cliente Vivo S.A.');
    expect(proforma.clienteRucCedula).toBe('1790000000001');
  });

  it('prioriza snapshot sobre relacion viva al exportar/mostrar', () => {
    const proforma = {
      clienteNombre: 'Cliente Congelado',
      clienteRucCedula: '1234567890',
      clienteDireccion: 'Guayaquil',
      clienteTelefono: '022222222',
      clienteCorreo: null,
      customer: {
        nombreCliente: 'Cliente Vivo S.A.',
        rucCedula: '1790000000001',
      },
    } as Proforma;

    const snapshot = resolveProformaCustomerSnapshot(proforma);
    expect(snapshot.nombreCliente).toBe('Cliente Congelado');
    expect(snapshot.rucCedula).toBe('1234567890');
  });
});
