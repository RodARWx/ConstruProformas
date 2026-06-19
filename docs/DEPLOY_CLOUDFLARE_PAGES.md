# Despliegue frontend en Cloudflare Pages

## Error común: `Invalid _redirects` + `npx wrangler deploy`

Cloudflare tiene **dos modos distintos**:

| Modo | Deploy command | SPA routing |
|------|----------------|-------------|
| **Cloudflare Pages (recomendado)** | *(vacío)* | Regla en dashboard o `_redirects` |
| **Workers + Wrangler** | `npx wrangler deploy` | Solo `wrangler.jsonc` assets SPA — **no** usar `_redirects` |

Mezclar `npx wrangler deploy` + `_redirects` provoca:

```
Infinite loop detected in this rule [code: 100324]
```

Si usas **Deploy command vacío** (modo Pages estático), el archivo `frontend/public/_redirects` incluido en el build configura el SPA automáticamente. **No** uses `_redirects` si volviste a poner `npx wrangler deploy`.

---

## Configuración correcta (Cloudflare Pages estático)

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Repositorio: `ContruProformas`
3. **Root directory:** `frontend`
4. **Build command:** `npm run build`
5. **Deploy command:** *(dejar VACÍO — borrar `npx wrangler deploy`)*
6. **Build output directory:** `dist`

### Variables de entorno (Production)

| Variable | Valor ejemplo |
|----------|---------------|
| `VITE_API_BASE_URL` | `https://construproformas-api-production.up.railway.app` |
| `VITE_API_KEY` | *(igual que `API_KEY` en Railway)* |
| `VITE_ACCESS_PIN` | `2585` |

> Puedes omitir `https://` y `/api`; el script `write-env-config.mjs` los añade al build.

### SPA (React Router) — paso 3

En muchos proyectos de Cloudflare Pages **no aparece** una sección "Redirects" en Settings. No es obligatorio configurarla manualmente: el build copia `frontend/public/_redirects` a `dist/` con:

```
/*    /index.html   200
```

Tras hacer push y redeploy, las rutas como `/proformas` funcionan al recargar la página.

Si tu panel sí muestra **Redirects** o **Single Page Application**, puedes añadir la misma regla allí como respaldo.

---

## Tras el deploy

1. Copia la URL del frontend (ej. `https://contruproformas.pages.dev`)
2. En **Railway** → backend → Variables:

```env
CORS_ORIGIN=https://contruproformas.pages.dev
```

3. Redeploy backend si hace falta.
4. Abre el frontend, ingresa PIN, prueba listar perfiles.

---

## Verificación rápida

```powershell
# Backend
Invoke-RestMethod https://construproformas-api-production.up.railway.app/api/health

# Frontend: abrir en navegador y revisar consola (sin errores CORS)
```
