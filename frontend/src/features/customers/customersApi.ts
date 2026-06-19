import { apiGet, apiPatch, apiPost } from '../../lib/api'
import type {
  CreateCustomerPayload,
  Customer,
  UpdateCustomerPayload,
} from '../../types/customer'

export async function fetchCustomers(): Promise<Customer[]> {
  return apiGet<Customer[]>('/customers')
}

export async function searchCustomers(
  q: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<Customer[]> {
  return apiGet<Customer[]>('/customers/search', {
    params: { q, limit },
    signal,
  })
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  return apiPost<Customer>('/customers', payload)
}

export async function updateCustomer(
  id: number,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  return apiPatch<Customer>(`/customers/${id}`, payload)
}
