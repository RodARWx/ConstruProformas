import type { Proforma } from '../types/proforma'

/** Datos del cliente mostrados en UI (snapshot congelado al guardar). */
export function getProformaCustomerDisplay(proforma: Proforma): {
  nombreCliente: string
  rucCedula: string
  direccion: string
  telefono: string
} {
  if (proforma.clienteNombre?.trim()) {
    return {
      nombreCliente: proforma.clienteNombre,
      rucCedula: proforma.clienteRucCedula ?? '',
      direccion: proforma.clienteDireccion ?? '',
      telefono: proforma.clienteTelefono ?? '',
    }
  }

  return {
    nombreCliente: proforma.customer?.nombreCliente ?? '',
    rucCedula: proforma.customer?.rucCedula ?? '',
    direccion: proforma.customer?.direccion ?? '',
    telefono: proforma.customer?.telefono ?? '',
  }
}
