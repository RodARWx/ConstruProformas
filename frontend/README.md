# Construproformas — Frontend (PWA)

Aplicación web mobile-first para generar y gestionar proformas de Construmétrica. Consume la API NestJS del backend (`/api`) y funciona como PWA instalable con soporte offline para borradores.

## Requisitos

- Node.js 20+
- npm 10+
- Backend Construproformas en ejecución (por defecto `http://localhost:3000/api`)

## Configuración de entorno

Copie el archivo de ejemplo y ajuste los valores:

```bash
cp .env.example .env
```

Variables disponibles:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | URL base del API | `/api` (dev con proxy) o `http://localhost:3000/api` |
| `VITE_API_KEY` | Clave enviada en header `X-API-KEY` | `construproformas-dev-key` |
| `VITE_ACCESS_PIN` | PIN de acceso del lado del cliente (no es login del backend) | `2585` |

### Desarrollo local (recomendado)

Use `VITE_API_BASE_URL=/api`. Vite hace proxy a `http://localhost:3000` y evita problemas de CORS sin modificar el backend.

### Producción / LAN

Apunte `VITE_API_BASE_URL` al servidor real, por ejemplo:

```env
VITE_API_BASE_URL=http://192.168.1.50:3000/api
VITE_API_KEY=<clave-de-produccion>
VITE_ACCESS_PIN=<pin-interno>
```

> Las variables `VITE_*` se embeben en el build. No incluya secretos de producción en repositorios públicos.

## Desarrollo

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`, ingrese el PIN configurado y use la app.

Comandos útiles:

```bash
npm run lint    # ESLint
npm run build   # Build de producción + PWA
npm run preview # Servir dist/ localmente
```

## Build de producción

```bash
npm run build
```

Salida en `dist/`:

- `index.html` — SPA
- `assets/` — JS/CSS empaquetados
- `manifest.webmanifest` — PWA
- `sw.js` — Service worker (cache de interfaz)

Para previsualizar el build:

```bash
npm run preview
```

### Despliegue

Sirva el contenido de `dist/` con cualquier servidor estático (nginx, Caddy, NAS, etc.). Configure fallback a `index.html` para rutas del React Router.

**Nota:** Este repositorio no incluye cambios en el `docker-compose.yml` raíz ni en la carpeta `backend/`. Si se requiere contenedor dedicado para el frontend, debe añadirse como servicio aislado y coordinarse aparte.

## Funcionalidades principales

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Nueva proforma | `/proformas/nueva` | Cabecera, búsqueda de cliente, selector de perfil emisor (solo lectura en servidor), detalle de rubros |
| Historial | `/proformas` | Listado, exportar PDF/Excel, clonar, editar borradores |
| Edición | `/proformas/:id/editar` | Borrador editable o vista solo lectura si está exportada |
| Catálogo | `/catalogo` | CRUD de rubros con categoría, días laborables e IVA % |
| Categorías | `/categorias` | CRUD de categorías de rubros |
| Clientes | `/clientes` | Alta, edición y búsqueda de clientes |

**No incluido en V2 (frontend):**

- Importación de proformas desde Excel
- Gestión CRUD de perfiles emisor (solo selector con los dos perfiles fijos del backend)
- Campo de notas / condiciones comerciales en la proforma

**Cálculos del servidor:** subtotal sin IVA, IVA total, total con IVA, tiempo de ejecución (Σ días laborables) y monto del contrato los calcula el backend al guardar. El cliente muestra esos valores en solo lectura; no los envía en `POST`/`PATCH`.

**IVA por línea:** cada rubro del detalle lleva `diasLaborables` e `ivaPercentage` editables por proforma (heredados del catálogo al agregar).

**PWA + offline:** borradores encolados en IndexedDB y sincronizados con `POST /proformas/sync` al recuperar conexión.

## Flujo recomendado (QA manual)

1. **Cliente** — `/clientes`: crear cliente con nombre, RUC/cédula, dirección y teléfono.
2. **Categoría** — `/categorias`: crear categoría (nombre único).
3. **Rubro** — `/catalogo`: crear rubro con categoría, días laborables e IVA %.
4. **Proforma** — `/proformas/nueva`:
   - Buscar el cliente (`GET /customers/search?q=`)
   - Seleccionar perfil emisor (`GET /profiles`)
   - Agregar rubros desde autocompletado (heredan días e IVA %)
   - Editar días laborables e IVA % por línea si hace falta
   - Revisar pie de tabla: subtotal, IVA, total con IVA y tiempo (vacíos hasta guardar)
5. **Guardar** — `POST /proformas` o `PATCH` en edición; totales se actualizan desde la respuesta del servidor.
6. **Historial** — exportar PDF/Excel, clonar (copia líneas con días e IVA %), editar borrador.

## Accesibilidad y marca

- Botones primarios usan **coral** con texto blanco (acento sobre fondo sólido).
- Enlaces y texto interactivo sobre fondos claros usan **wine** (`#550012`) con subrayado visible (no dependen solo de `:hover`).
- Navegación móvil con áreas táctiles mínimas (~48px).
- Estados `:focus-visible` en botones y enlaces para teclado.
- `prefers-reduced-motion` reduce animaciones.

## Checklist de pruebas finales (QA)

Ejecute en **móvil** (o DevTools responsive) y en **escritorio**.

### Acceso y navegación

- [ ] Pantalla `/acceso` acepta PIN correcto y rechaza PIN incorrecto
- [ ] Menú inferior (móvil) y sidebar (escritorio): Nueva, Historial, Catálogo, Categorías, Clientes
- [ ] Indicador de conexión muestra En línea / Sin conexión

### Maestros

- [ ] **Clientes:** crear, editar, buscar por nombre o cédula
- [ ] **Categorías:** crear, editar, eliminar (409 si tiene rubros)
- [ ] **Catálogo:** rubro con categoría, días laborables e IVA %

### Flujo completo de proforma

- [ ] **Crear:** ID sugerido, proyecto, cliente por búsqueda, perfil emisor (solo selector)
- [ ] **Rubros:** autocompletado catálogo (≥3 caracteres), línea vacía, APU local opcional por línea
- [ ] **Días e IVA:** editables por línea; pie de tabla muestra totales del servidor tras guardar
- [ ] **Guardar:** `POST /proformas` (nueva) o `PATCH` (borrador)
- [ ] **Exportar:** desde historial → EXPORTED; toast con totales y rutas de archivos
- [ ] **Clonar:** plantilla en `/proformas/nueva` con líneas (días e IVA % copiados)

### Offline / PWA

- [ ] `npm run build` + `npm run preview` — app instalable (manifest + service worker)
- [ ] Sin red: guardar borrador encola en IndexedDB y muestra toast
- [ ] Al reconectar: sincronización automática vía `POST /proformas/sync`
- [ ] Si falla un ítem: queda pendiente y permite **Reintentar** en el header
- [ ] Interfaz principal sigue usable offline (shell cacheada)

### Accesibilidad táctil y contraste

- [ ] Ninguna acción crítica requiere solo hover (botones/enlaces funcionan con toque)
- [ ] Enlaces visibles sin pasar el mouse (subrayado wine)
- [ ] Texto principal legible sobre fondo `#fafafa` / blanco
- [ ] Coral solo en botones con texto blanco, no como texto pequeño sobre fondo claro

### Validaciones

- [ ] Campos obligatorios muestran error inline + toast
- [ ] ID duplicado muestra advertencia 409
- [ ] Días laborables ≥ 1 e IVA % entre 0 y 100 por línea

## Estructura relevante

```
src/
├── components/     # UI y layout
├── context/        # App, borrador, sincronización offline
├── features/       # proformas, catálogo, categorías, clientes, perfiles (solo lectura)
├── pages/          # Rutas por pantalla
├── lib/            # API, formato, toasts
└── types/          # Tipos compartidos
```

## API esperada

Todas las peticiones (excepto health) requieren:

```http
X-API-KEY: <VITE_API_KEY>
Content-Type: application/json
```

Los totales de proforma siempre deben mostrarse desde la respuesta del servidor, no como cálculo definitivo del cliente.

Payload de proforma (`POST`/`PATCH`): cabecera + `detalles[]` con `diasLaborables` e `ivaPercentage` por línea. **No** enviar `appliesIva`, `montoContrato`, `tiempoEjecucion` ni `notas`.
