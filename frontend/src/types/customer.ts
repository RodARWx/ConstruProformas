export interface Customer {
  id: number
  nombreCliente: string
  rucCedula: string
  direccion: string | null
  telefono: string | null
  correo: string | null
  discountPercentage?: number
}

export interface CreateCustomerPayload {
  nombreCliente: string
  rucCedula: string
  telefono?: string
  correo?: string
  direccion?: string
  discountPercentage?: number
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>
