import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { getApiBaseUrl, getApiKey, isLikelyMisconfiguredApiUrl } from './runtimeEnv'

const API_BASE_URL = getApiBaseUrl()
const API_KEY = getApiKey()

/** Cliente HTTP centralizado para la API de Construproformas. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-API-KEY': API_KEY } : {}),
  },
})

/** Garantiza que la respuesta del backend sea un arreglo (evita pantalla en blanco si la URL apunta al sitio estático). */
export function ensureArray<T>(data: unknown, resourceLabel: string): T[] {
  if (Array.isArray(data)) {
    return data as T[]
  }

  throw new Error(
    `Respuesta inválida al cargar ${resourceLabel}. Verifique VITE_API_BASE_URL (debe apuntar al backend con /api).`,
  )
}

/** Descarga un archivo binario del backend y lo guarda en el dispositivo del usuario. */
export async function apiDownloadFile(path: string, filename: string): Promise<void> {
  const response = await apiClient.get(path, { responseType: 'blob' })
  const blob = response.data as Blob
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

/**
 * Descarga el archivo como blob (con autenticación) y lo abre en una nueva pestaña.
 * Para PDFs el navegador lo muestra con su visor nativo (zoom, imprimir, descargar).
 * Necesario porque window.open() no envía cabeceras X-API-KEY.
 */
export async function apiOpenFileInline(path: string): Promise<void> {
  const response = await apiClient.get(path, { responseType: 'blob' })
  const blob = response.data as Blob
  const objectUrl = URL.createObjectURL(blob)
  const tab = window.open(objectUrl, '_blank', 'noopener,noreferrer')
  if (!tab) {
    // Fallback: si el popup blocker lo impidió, forzar descarga
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.target = '_blank'
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  // Liberar el objectUrl después de un momento (el navegador ya lo leyó)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}


/** Petición GET tipada sobre el cliente configurado. */
export async function apiGet<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.get<T>(path, config)
  return response.data
}

/** Petición POST tipada sobre el cliente configurado. */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.post<T>(path, body, config)
  return response.data
}

/** Petición PATCH tipada sobre el cliente configurado. */
export async function apiPatch<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.patch<T>(path, body, config)
  return response.data
}

/** Petición DELETE tipada sobre el cliente configurado. */
export async function apiDelete<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.delete<T>(path, config)
  return response.data
}

/** Extrae un mensaje legible desde errores de axios o genéricos. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(data?.message)) {
      return data.message.join(', ')
    }
    if (typeof data?.message === 'string') {
      return data.message
    }
    if (!error.response) {
      if (isLikelyMisconfiguredApiUrl()) {
        return (
          'No se puede conectar con el backend. Configure VITE_API_BASE_URL con la URL ' +
          'completa del API (ej. https://su-backend.onrender.com/api) y redepliegue el frontend.'
        )
      }
      return (
        `No se puede conectar con el backend (${API_BASE_URL}). ` +
        'Verifique que el servicio API esté activo, CORS_ORIGIN incluya esta app y VITE_API_KEY coincida con API_KEY.'
      )
    }
    if (error.message) {
      return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Error desconocido al conectar con el backend'
}

/** Indica si el error es un conflicto HTTP 409 del backend. */
export function isApiConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409
}
