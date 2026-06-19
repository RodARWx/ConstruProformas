# Cambios Backend V2

Registro de modificaciones al backend durante la iteración V2 de Construproformas.

---

## 2026-06-19 — BACKEND FASE 1: Categorías y extensión del catálogo

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/src/categories/` (nuevo módulo) | Entidad y CRUD de categorías | Módulo `categories` con entidad `Category` (PK `nombre`), DTOs, service y controller siguiendo el patrón existente. |
| `backend/src/categories/entities/category.entity.ts` | Modelo de datos V2 | `nombre` como clave primaria única; `descripcion` opcional; relación OneToMany con `ItemCatalog`. |
| `backend/src/categories/categories.controller.ts` | API REST | Endpoints `GET/POST/PATCH/DELETE` bajo `/categories`. |
| `backend/src/categories/categories.service.ts` | Reglas de negocio | POST → 409 si nombre duplicado; DELETE → 409 si tiene rubros; GET lista categorías con rubros ordenados alfabéticamente. |
| `backend/src/categories/categories.module.ts` | Integración NestJS | Registro del módulo y export de `CategoriesService`. |
| `backend/src/app.module.ts` | Wiring | Import de `CategoriesModule`. |
| `backend/src/catalog/entities/item-catalog.entity.ts` | Extensión catálogo V2 | Campos `diasLaborables` (default 1), `ivaPercentage` (default 15), relación ManyToOne nullable `categoriaNombre` → `Category.nombre`. |
| `backend/src/catalog/dto/create-catalog-item.dto.ts` | Validación entrada | Soporte opcional para `categoriaNombre`, `diasLaborables` (@Min(1)), `ivaPercentage` (0–100). |
| `backend/src/catalog/dto/update-catalog-item.dto.ts` | Validación actualización | Mismos campos opcionales en PATCH. |
| `backend/src/catalog/dto/list-catalog-query.dto.ts` | Filtro listado | Query opcional `categoriaNombre` en `GET /catalog`. |
| `backend/src/catalog/dto/search-catalog-query.dto.ts` | Filtro búsqueda | Query opcional `categoriaNombre` en `GET /catalog/search`. |
| `backend/src/catalog/catalog.service.ts` | Lógica catálogo | Persistencia de nuevos campos; validación de categoría existente; filtro por categoría en list/search. |
| `backend/src/catalog/catalog.controller.ts` | API catálogo | Pasa filtros de query al service. |
| `backend/src/catalog/catalog.module.ts` | Dependencias | Import de `CategoriesModule` para validar referencias. |

**Notas de diseño:**

- `PATCH /categories/:nombre` solo permite editar `descripcion`. **No se implementó renombrar** categorías porque `categoriaNombre` es FK en `item_catalog`; renombrar exigiría migración en cascada de referencias y se evaluará en fase futura si hace falta.
- No se modificó el módulo de proformas ni `proforma-calculator.helper.ts` (según alcance de esta fase).

---

## 2026-06-19 — BACKEND FASE 2: Seed manual del catálogo desde Excel

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/scripts/seed-catalog-from-excel.ts` | Carga inicial única | Script manual (`npm run seed:catalog`) que lee `seed-data/productos.xlsx` e inserta categorías y rubros. No se ejecuta en el arranque de la app. |
| `backend/scripts/catalog-estimation.helper.ts` | Valores iniciales estimados | Heurística de `unidad` y `costoUnitario` según tipo de servicio (topografía, alquiler, replanteo, etc.). Valores editables después desde la app. |
| `backend/package.json` | Comando npm | Script `"seed:catalog": "ts-node scripts/seed-catalog-from-excel.ts"`. |
| `backend/src/config/database.config.ts` | Entidad faltante | Registro de `Category` en `entities` de TypeORM (requerido para sincronizar tabla en runtime NestJS). |
| `backend/seed-data/productos.xlsx` | Fuente de datos | Archivo de referencia agregado manualmente por el equipo (98 rubros, 11 categorías). |

**Comportamiento del seed:**

- Columnas Excel: **Código** → `codigoSugerido`, **Categoría** → categoría (reutilizada por nombre), **Nombre** → `descripcion`, **Porcentaje IVA** → `ivaPercentage` (tal cual, incluye 0).
- `diasLaborables = 1` por defecto (no viene en Excel).
- `unidad` y `costoUnitario` estimados por heurística (no vienen en Excel).
- Idempotente: segunda ejecución omite rubros existentes por `codigoSugerido`.
- Usa `node:sqlite` (API nativa de Node) para escribir en SQLite sin depender del arranque NestJS.

**Ejecución local confirmada (primera corrida):**

- 11 categorías creadas
- 98 rubros insertados
- Segunda corrida: 0 insertados, 98 omitidos (sin duplicados)

**Nota importante:** el Excel es solo fuente de carga inicial. Después del seed, cualquier edición de unidad, costo, categoría o IVA se hace desde la aplicación (base de datos vía API), nunca volviendo a leer el Excel.

---

## 2026-06-19 — BACKEND FASE 3: Gestión de clientes (búsqueda y validaciones)

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/src/customers/entities/customer.entity.ts` | Modelo existente confirmado | Campo `telefono` ya presente (`nullable`). `rucCedula` con `@Column({ unique: true })`. `nombreCliente` obligatorio a nivel columna (`NOT NULL`). |
| `backend/src/customers/dto/create-customer.dto.ts` | Validación entrada | `nombreCliente` con `@IsNotEmpty`; `rucCedula` obligatorio; `telefono` opcional con `@IsOptional`. |
| `backend/src/customers/customers.service.ts` | Reglas de negocio | `assertRucCedulaAvailable` → **409** si RUC duplicado; `remove` → **409** si el cliente tiene proformas; nuevo `searchByText` (LIKE en `nombreCliente` o `rucCedula`). |
| `backend/src/customers/dto/search-customers-query.dto.ts` | Query de búsqueda | DTO con `q` obligatorio y `limit` opcional (1–50, default 20). |
| `backend/src/customers/customers.controller.ts` | API REST | Nuevo `GET /customers/search?q=&limit=` declarado **antes** de `GET /customers/:id` para evitar conflicto de rutas. |

**Endpoint nuevo:**

- `GET /api/customers/search?q=<texto>&limit=<n>` — autocompletado por coincidencia parcial en nombre o RUC/Cédula; patrón alineado con `GET /catalog/search`.

**Reglas confirmadas (sin cambios de esquema):**

| Regla | Implementación |
|-------|----------------|
| `telefono` opcional | Columna nullable + DTO `@IsOptional` |
| `rucCedula` único | Unique en entidad + validación en create/update → 409 |
| `nombreCliente` obligatorio | `@IsNotEmpty` en POST |
| DELETE con proformas | `ConflictException` (409) en `remove()` |

**Verificación local:**

- `npm run build` y `npm test` (5/5) OK.
- Prueba manual de reglas DELETE y búsqueda LIKE ejecutada sobre SQLite con `node:sqlite` (NestJS no arrancó en Windows por bindings de `better-sqlite3`; en Docker/NAS la verificación HTTP es equivalente):
  - Cliente con 1 proforma → bloqueo de eliminación (409 esperado).
  - Cliente sin proformas → eliminable.
  - Búsqueda `q=andina`, `q=091234`, `q=quito&limit=1` devuelve coincidencias correctas.

**No modificado:** módulo proformas, calculador de totales, catálogo ni categorías.

---

## 2026-06-19 — BACKEND FASE 4: Perfiles fijos de Construmétrica

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/src/profiles/fixed-profiles.constant.ts` | Fuente única de verdad | Constante `FIXED_PROFILES` con los dos perfiles oficiales (ids 1 y 2) y helper `profileMatchesFixed`. |
| `backend/src/database/database-seed.service.ts` | Seed al arranque | Reemplaza el perfil de prueba anterior; sincroniza exactamente los dos perfiles oficiales. Elimina perfiles extra y reasigna proformas huérfanas a `profileId = 1`. |
| `backend/src/database/database.module.ts` | Dependencias seed | Import de entidad `Proforma` para reasignación referencial antes de borrar perfiles no oficiales. |
| `backend/src/profiles/profiles.controller.ts` | API solo lectura | Eliminados `POST`, `PATCH` y `DELETE`. Activos: `GET /profiles` y `GET /profiles/:id`. |
| `backend/src/profiles/profiles.service.ts` | Lógica acotada | Eliminados `create`, `update` y `remove`; solo `findAll` y `findOne`. |
| `backend/src/profiles/profiles.module.ts` | Wiring | Ya no importa `Proforma` (solo lectura). |

**Perfiles oficiales (siempre ids 1 y 2):**

| id | nombre | cargo | registroSenescyt | telefono | correo |
|----|--------|-------|------------------|----------|--------|
| 1 | Ing. Mario David Lincango Callatasig | Gerente General | 1005-2018-1984075 | 0992914455 | mario.lincango@construmetrica.com |
| 2 | Ing. Francisco Paul López Males | Presidente | 1005-2018-1984076 | 0997373003 | francisco.lopez@construmetrica.com |

**Comportamiento del seed:**

- Al arrancar NestJS, si los perfiles no coinciden con `FIXED_PROFILES`, se actualizan ids 1 y 2 y se eliminan registros adicionales.
- Proformas que apuntaban a perfiles eliminados se reasignan automáticamente al perfil id=1.
- Idempotente: si ya existen los dos perfiles correctos, no hace cambios.

**Endpoints de perfiles (post-cambio):**

| Método | Ruta | Estado |
|--------|------|--------|
| GET | `/api/profiles` | Activo |
| GET | `/api/profiles/:id` | Activo |
| POST | `/api/profiles` | **Eliminado** (404 Nest) |
| PATCH | `/api/profiles/:id` | **Eliminado** |
| DELETE | `/api/profiles/:id` | **Eliminado** |

**No modificado:** módulo proformas (salvo reasignación en seed), calculador, catálogo, clientes ni categorías.

---

## 2026-06-19 — BACKEND FASE 5: IVA por línea y totales automáticos ⚠️

> **Cambio de regla de negocio importante.** El IVA ya no se calcula a nivel de proforma con `appliesIva` + tasa global. Cada línea tiene su propio `ivaPercentage`; el backend recalcula todo en servidor.

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/src/proformas/entities/proforma-detail.entity.ts` | Modelo V2 | Nuevos campos `diasLaborables` (int, min 1) e `ivaPercentage` (0–100). |
| `backend/src/proformas/entities/proforma.entity.ts` | Cabecera V2 | Eliminado `appliesIva`. Nuevo `montoContrato` (calculado). `tiempoEjecucion` pasa a ser valor calculado (suma de días). |
| `backend/src/proformas/helpers/proforma-calculator.helper.ts` | **Nueva fórmula** | IVA por línea; `montoContrato = totalGeneral`; `tiempoEjecucion = Σ diasLaborables`. |
| `backend/src/proformas/helpers/proforma-calculator.helper.spec.ts` | Tests Jest | Casos: IVA distinto por línea, línea con 0%, suma de días, `montoContrato`. |
| `backend/src/proformas/dto/create-proforma-detail.dto.ts` | Validación | Campos obligatorios `diasLaborables` e `ivaPercentage`. |
| `backend/src/proformas/dto/update-proforma-detail.dto.ts` | Validación | Idem en edición de líneas. |
| `backend/src/proformas/dto/create-proforma.dto.ts` | Entrada cabecera | Eliminados `appliesIva` y `tiempoEjecucion` (rechazados por `forbidNonWhitelisted`). |
| `backend/src/proformas/dto/update-proforma.dto.ts` | Entrada cabecera | Eliminados `appliesIva` y `tiempoEjecucion`. |
| `backend/src/proformas/dto/import-preview.dto.ts` | Import preview | Eliminado `appliesIva`; rubros con `diasLaborables`/`ivaPercentage` opcionales (default 1 y 15). |
| `backend/src/proformas/dto/import-preview-result.dto.ts` | Respuesta preview | Incluye `montoContrato` y `tiempoEjecucion`; eliminados `appliesIva` e `ivaRate`. |
| `backend/src/proformas/proformas.service.ts` | Persistencia | Usa nuevo calculador; persiste campos calculados; import-preview con misma lógica. |
| `backend/src/export/services/proforma-pdf-export.service.ts` | Exportación | Muestra fila IVA si `proforma.iva > 0` (ya no depende de `appliesIva`). |
| `backend/src/export/services/proforma-excel-export.service.ts` | Exportación | Idem PDF. |
| `backend/scripts/test-integration.ps1` | Pruebas manuales | Payloads actualizados sin `appliesIva`. |
| `backend/.env.example` | Documentación env | `IVA_RATE` marcado como obsoleto para cálculo de proformas. |

**Fórmulas (backend, fuente única de verdad):**

| Concepto | Fórmula |
|----------|---------|
| Total línea | `cantidad × costoUnitario` (2 dec.) |
| IVA línea | `total línea × (ivaPercentage / 100)` |
| Subtotal | Σ total línea |
| IVA total | Σ IVA línea |
| Total general | subtotal + IVA total |
| Monto contrato | = total general |
| Tiempo ejecución | Σ `diasLaborables` de todas las líneas (texto) |

**Campos que el cliente NO puede enviar en create/update:**

- `tiempoEjecucion`, `montoContrato`, `subtotal`, `iva`, `totalGeneral` → rechazados por ValidationPipe (`forbidNonWhitelisted: true`).
- `appliesIva` → eliminado del modelo.

**Migración de esquema (SQLite sync):**

- Columnas nuevas en `proforma_details`: `diasLaborables` default 1, `ivaPercentage` default 15.
- Columna nueva en `proformas`: `montoContrato` default 0.
- Columna eliminada: `appliesIva`.

**Verificación:** `npm run build` y `npm test` (Jest, helper de cálculo).

---

## 2026-06-19 — BACKEND FASE 6: Retiro de import-preview y campo notas en entrada

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/src/proformas/proformas.controller.ts` | Fin de import Excel | Eliminado `POST /proformas/import-preview`. |
| `backend/src/proformas/proformas.service.ts` | Limpieza | Eliminados `previewImport` y `mapImportRubroToDetail`. Create/sync ya no aceptan `notas`. |
| `backend/src/proformas/dto/import-preview.dto.ts` | **Eliminado** | DTO ya no necesario. |
| `backend/src/proformas/dto/import-preview-result.dto.ts` | **Eliminado** | Idem. |
| `backend/src/proformas/dto/create-proforma.dto.ts` | Entrada V2 | Eliminado `notas` del payload aceptado. |
| `backend/src/proformas/dto/update-proforma.dto.ts` | Entrada V2 | Eliminado `notas` del payload aceptado. |
| `backend/scripts/test-integration.ps1` | Pruebas | Eliminado bloque de `import-preview`. |

**Decisión sobre `import-preview`:** **eliminación completa** (endpoint, DTOs y lógica de servicio). El frontend deja de importar Excel; el cálculo equivalente ya vive en `calculateProformaTotals` usado por create/update. Si se retoma en el futuro, el código está en el historial de Git.

**Decisión sobre `notas`:** **conservada en base de datos y entidad** (`proformas.notas` nullable). No se elimina la columna para preservar histórico. El campo ya no se acepta en create/update/sync (`forbidNonWhitelisted` → 400 si se envía). Las proformas nuevas se guardan con `notas = null`. Al clonar una proforma antigua con notas, la copia conserva el texto histórico. PDF/Excel siguen mostrando notas si existen en registros previos.

**Endpoints de proformas (post-cambio):**

| Método | Ruta | Estado |
|--------|------|--------|
| POST | `/api/proformas/import-preview` | **Eliminado** (404 Nest) |

**Verificación:** `npm run build` y `npm test`.

---

## 2026-06-19 — DESPLIEGUE FASE 1: Docker, CORS y variables de entorno

| Archivo | Motivo | Descripción |
|---------|--------|-------------|
| `backend/Dockerfile` | Imagen de producción | Multi-stage Alpine; compila `better-sqlite3` en builder; copia `node_modules` + `dist`; `ENV PORT=3000`; `HEALTHCHECK` contra `/api/health`; `CMD node dist/src/main.js`; volumen `/app/data`. |
| `backend/src/main.ts` | CORS configurable | `app.enableCors(...)` solo si `CORS_ORIGIN` está definido (lista separada por comas o `*`). Puerto desde `process.env.PORT`. |
| `docker-compose.yml` | NAS / local | `DATABASE_PATH=/app/data/construproformas.db`; volumen `sqlite-data:/app/data` (BD + `exports/`); pasa `CORS_ORIGIN`; healthcheck con `$PORT`. |
| `.env.example` (raíz) | Compose | Documenta `API_PORT`, `PORT`, `API_KEY`, `CORS_ORIGIN`, `DB_SYNCHRONIZE`, `IVA_RATE`. |
| `backend/.env.example` | Backend / Railway | Documenta `PORT`, `DATABASE_PATH`, `CORS_ORIGIN`, `DB_SYNCHRONIZE`, `API_KEY` y ruta de exports. |

**Persistencia de datos (Docker):**

| Ruta en contenedor | Contenido |
|--------------------|-----------|
| `/app/data/construproformas.db` | Base SQLite (`DATABASE_PATH`) |
| `/app/data/exports/` | PDF y Excel generados por `POST /proformas/:id/export` |

Ambas rutas quedan bajo el volumen montado `/app/data`.

**Healthcheck (Railway / Docker):**

- `GET /api/health` → `{ status: 'ok', service: 'construproformas-api' }`
- Decorador `@Public()` → **no requiere** header `X-API-KEY`
- Dockerfile y compose usan `curl` contra `http://127.0.0.1:${PORT}/api/health`

**CORS (`CORS_ORIGIN`):**

| Valor | Comportamiento |
|-------|----------------|
| *(vacío / no definido)* | CORS deshabilitado (dev con proxy Vite sigue funcionando) |
| `https://app.ejemplo.com` | Un solo origen |
| `https://a.com,https://b.com` | Varios orígenes |
| `*` | Cualquier origen |

Headers permitidos: `Content-Type`, `Authorization`, `X-API-KEY`.

**Railway:** configurar variables `PORT` (automático), `DATABASE_PATH=/app/data/construproformas.db`, `API_KEY`, `CORS_ORIGIN`, montar volumen en `/app/data`. Health check path: `/api/health`.

**No modificado:** lógica de negocio, módulos de dominio ni calculador de proformas.
