import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { getApiBaseUrl, isLikelyMisconfiguredApiUrl } from './runtimeEnv'

const API_BASE_URL = getApiBaseUrl()

/** Token de sesión almacenado en localStorage para persistir entre pestañas y recargas. */
const TOKEN_KEY = 'construproformas_jwt'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage clear errors
  }
}

/** Cliente HTTP centralizado para la API de Construproformas. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Interceptor de request: adjuntar token JWT si existe ──
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Interceptor de response: redirigir al login si el token expiró / es inválido ──
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken()
      // Redirigir a la pantalla de acceso solo si no estamos ya en ella
      if (window.location.pathname !== '/acceso') {
        window.location.href = '/acceso'
      }
    }
    return Promise.reject(error)
  },
)

/** Garantiza que la respuesta del backend sea un arreglo. */
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
 * Construye la URL completa hacia un archivo con el token JWT en query param.
 * Permite que el navegador abra el archivo directamente en una pestaña nueva
 * preservando el nombre institucional en el visor nativo de PDF y descargas.
 */
export function getAuthenticatedFileUrl(path: string): string {
  const token = getStoredToken()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const separator = cleanPath.includes('?') ? '&' : '?'
  return token
    ? `${API_BASE_URL}${cleanPath}${separator}token=${encodeURIComponent(token)}`
    : `${API_BASE_URL}${cleanPath}`
}

/**
 * Abre o descarga un archivo de proforma respetando su nombre institucional:
 * - Excel (.xlsx): Descarga directa inmediata con el nombre exacto de la versión.
 * - PDF (.pdf): Abre en pestaña nueva con la URL autenticada directa para que el visor nativo
 *   muestre el nombre real del archivo en la pestaña y al guardarlo.
 *   Si el navegador bloquea la ventana emergente, recurre a descarga directa como blob.
 */
export async function apiOpenFileInline(path: string, filename?: string): Promise<void> {
  const isExcel =
    filename?.toLowerCase().endsWith('.xlsx') ||
    path.toLowerCase().includes('.xlsx')

  // Para archivos Excel: descarga directa con el nombre exacto
  if (isExcel && filename) {
    await apiDownloadFile(path, filename)
    return
  }

  // Para PDFs: abrir únicamente en pestaña nueva con la URL autenticada directa
  const directUrl = getAuthenticatedFileUrl(path)
  const anchor = document.createElement('a')
  anchor.href = directUrl
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
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
        'Verifique que el servicio API esté activo, CORS_ORIGIN incluya esta app y el token sea válido.'
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
