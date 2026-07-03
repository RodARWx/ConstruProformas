/** Cliente genérico para proformas sin contratante identificado (alcance V2.0 §9). */
export const GENERIC_CUSTOMER = {
  nombreCliente: 'A quien interese',
  rucCedula: '1000000000',
  telefono: '0999999999',
  direccion: '',
} as const

export function isGenericCustomer(
  rucCedula: string,
  nombreCliente?: string,
): boolean {
  return (
    rucCedula.trim() === GENERIC_CUSTOMER.rucCedula ||
    (nombreCliente?.trim().toLowerCase() ===
      GENERIC_CUSTOMER.nombreCliente.toLowerCase() &&
      rucCedula.trim() === GENERIC_CUSTOMER.rucCedula)
  )
}
