import { Customer } from '../../customers/entities/customer.entity';
import { Proforma } from '../entities/proforma.entity';

/** Datos del cliente congelados en la proforma al momento de guardar/exportar. */
export interface ProformaCustomerSnapshot {
  nombreCliente: string;
  rucCedula: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
}

export function buildCustomerSnapshotFromEntity(
  customer: Customer,
): ProformaCustomerSnapshot {
  return {
    nombreCliente: customer.nombreCliente,
    rucCedula: customer.rucCedula,
    direccion: customer.direccion,
    telefono: customer.telefono,
    correo: customer.correo,
  };
}

/** Copia el snapshot del cliente maestro sobre la entidad proforma. */
export function applyCustomerSnapshotToProforma(
  proforma: Proforma,
  customer: Customer,
): void {
  const snapshot = buildCustomerSnapshotFromEntity(customer);
  proforma.clienteNombre = snapshot.nombreCliente;
  proforma.clienteRucCedula = snapshot.rucCedula;
  proforma.clienteDireccion = snapshot.direccion;
  proforma.clienteTelefono = snapshot.telefono;
  proforma.clienteCorreo = snapshot.correo;
}

/**
 * Resuelve los datos del cliente para UI/exportación.
 * Prioriza columnas snapshot; usa la relación viva solo en registros legacy.
 */
export function resolveProformaCustomerSnapshot(
  proforma: Proforma,
): ProformaCustomerSnapshot {
  if (proforma.clienteNombre?.trim()) {
    return {
      nombreCliente: proforma.clienteNombre,
      rucCedula: proforma.clienteRucCedula ?? '',
      direccion: proforma.clienteDireccion ?? null,
      telefono: proforma.clienteTelefono ?? null,
      correo: proforma.clienteCorreo ?? null,
    };
  }

  if (proforma.customer) {
    return buildCustomerSnapshotFromEntity(proforma.customer);
  }

  return {
    nombreCliente: '',
    rucCedula: '',
    direccion: null,
    telefono: null,
    correo: null,
  };
}
