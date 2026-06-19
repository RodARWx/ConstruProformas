export type RuntimeEnv = {
  VITE_API_BASE_URL?: string
  VITE_API_KEY?: string
  VITE_ACCESS_PIN?: string
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv
  }
}

/** Lee una variable: primero runtime (env-config.js), luego build de Vite. */
function readEnv(key: keyof RuntimeEnv): string {
  const runtime = window.__ENV__?.[key]
  if (typeof runtime === 'string' && runtime.length > 0) {
    return runtime
  }
  const built = import.meta.env[key]
  return typeof built === 'string' ? built : ''
}

export function getApiBaseUrl(): string {
  const url = readEnv('VITE_API_BASE_URL')
  if (url) {
    return url.replace(/\/+$/, '')
  }
  return 'http://localhost:3000/api'
}

export function getApiKey(): string {
  return readEnv('VITE_API_KEY')
}

export function getAccessPin(): string {
  return readEnv('VITE_ACCESS_PIN')
}

/** Indica si la URL apunta al mismo host (típico error: /api en sitio estático). */
export function isLikelyMisconfiguredApiUrl(): boolean {
  const url = readEnv('VITE_API_BASE_URL')
  if (!url || url === '/api') {
    return typeof window !== 'undefined'
  }
  if (url.startsWith('/')) {
    return true
  }
  try {
    const parsed = new URL(url)
    return parsed.origin === window.location.origin
  } catch {
    return false
  }
}
