/**
 * Genera dist/env-config.js para inyectar variables en runtime (Render/Railway/Docker).
 * Vite solo embebe VITE_* en build time; este archivo permite actualizarlas al arrancar.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const config = {
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? '',
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
if (!apiUrl || apiUrl === '/api') {
  console.warn(
    '[env-config] ADVERTENCIA: VITE_API_BASE_URL no está definida o es "/api".',
    'En producción debe ser la URL completa del backend, por ejemplo:',
    'https://tu-backend.onrender.com/api',
  )
} else {
  console.log('[env-config] Escrito en', join(outDir, 'env-config.js'), '→', apiUrl)
}
