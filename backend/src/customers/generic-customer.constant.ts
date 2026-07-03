/** Cliente genérico frecuente en proformas sin datos del contratante. */
export const GENERIC_CUSTOMER = {
  nombreCliente: 'A quien interese',
  rucCedula: '1000000000',
  telefono: '0999999999',
  direccion: '',
  correo: null as string | null,
} as const;

export function isGenericCustomerRuc(rucCedula: string): boolean {
  return rucCedula.trim() === GENERIC_CUSTOMER.rucCedula;
}
