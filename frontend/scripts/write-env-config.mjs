/**
 * Genera dist/env-config.js para inyectar variables en runtime (Render/Railway/Docker/Cloudflare).
 * Vite solo embebe VITE_* en build time; este script normaliza la URL del API al build.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Normaliza VITE_API_BASE_URL para producción.
 * Acepta: construproformas-api.up.railway.app
 * Devuelve: https://construproformas-api.up.railway.app/api
 */
function normalizeApiBaseUrl(raw) {
  let url = (raw ?? '').trim()
  if (!url || url === '/api') {
    return ''
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  url = url.replace(/\/+$/, '')

  if (!url.endsWith('/api')) {
    url = `${url}/api`
  }

  return url
}

const outDir = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const config = {
  VITE_API_BASE_URL: normalizeApiBaseUrl(process.env.VITE_API_BASE_URL),
  VITE_API_KEY: process.env.VITE_API_KEY ?? '',
  VITE_ACCESS_PIN: process.env.VITE_ACCESS_PIN ?? '',
}

mkdirSync(outDir, { recursive: true })
writeFileSync(
  join(outDir, 'env-config.js'),
  `window.__ENV__=${JSON.stringify(config)};\n`,
  'utf8',
)

const apiUrl = config.VITE_API_BASE_URL
if (!apiUrl) {
  console.warn(
    '[env-config] ADVERTENCIA: VITE_API_BASE_URL no está definida o es "/api".',
    'En producción use la URL del backend, por ejemplo:',
    'https://construproformas-api-production.up.railway.app',
    '(se añaden https:// y /api automáticamente)',
  )
} else {
  console.log('[env-config] Escrito en', join(outDir, 'env-config.js'), '→', apiUrl)
}
