import { apiPost } from './api'

interface LoginResponse {
  access_token: string
  expires_in: number
}

/**
 * Llama al backend para validar el PIN y obtener un JWT.
 * Lanza error si el PIN es incorrecto (401).
 */
export async function loginWithPin(pin: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', { pin })
}
