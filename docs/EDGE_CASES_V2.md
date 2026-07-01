# Casos extremos (edge cases) — Versión 2.0

Guía de pruebas para Construproformas. Complementa el script automatizado `backend/scripts/test-edge-cases.ps1`.

---

## Cómo probar de forma ágil

### Automatizado (API local)

```powershell
cd backend
npm run start:dev
# En otra terminal:
npm run test:edge-cases
```

Requisitos: API en `http://localhost:3000`, `X-API-KEY` igual a `construproformas-dev-key`.

### Unitario (sin servidor)

```powershell
cd backend
npm test -- proforma-id.helper.spec
npm test -- proforma-calculator.helper.spec
```

### Manual (PWA)

Use la columna **Resultado esperado** como criterio de aceptación en el navegador.

---

## Matriz de casos extremos

| # | Escenario | Cómo probar | Resultado esperado |
|---|-----------|-------------|-------------------|
| E1 | Dos usuarios crean proforma con el mismo ID al mismo tiempo | Script: dos `POST /proformas` seguidos con mismo `idProforma` | El segundo recibe **409 Conflict**; no hay duplicados activos |
| E2 | ID repetido en borrador activo | `POST /proformas` con ID ya usado en DRAFT | **409** con mensaje de ID en uso |
| E3 | ID repetido en proforma exportada | Intentar crear con ID de registro EXPORTED | **409** indicando proforma exportada |
| E4 | ID en papelera (soft delete) | Soft delete → intentar crear con mismo ID | **409** indicando que está en papelera |
| E5 | ID tras eliminación permanente | Papelera → eliminar permanentemente → `GET next-id` o crear manual | El ID puede reutilizarse; `next-id` no cuenta filas borradas en duro |
| E6 | Borrar proforma más reciente (ej. CM-PROF-10) y crear otra | Soft delete CM-PROF-10 → `GET next-id` | Sugiere **CM-PROF-11** (no reutiliza 10 mientras esté en papelera) |
| E7 | Listado con 100+ clientes | `GET /customers` y búsqueda `?q=a&limit=50` | Lista paginada por búsqueda; no bloquea UI si se usa autocomplete con límite |
| E8 | Eliminar categoría con rubros | `DELETE /categories/{nombre}` con rubros asociados | **409 Conflict**; mensaje indica reasignar rubros |
| E8b | Eliminar categoría vacía | `DELETE /categories/{nombre}` sin rubros | **200** eliminación correcta |
| E9 | Borrador guardado y cambio de rubro en catálogo | Editar precio en catálogo → reabrir borrador sin guardar | Líneas conservan valores guardados |
| E10 | Borrador y cambio de cliente | Editar cliente en maestro → reabrir borrador sin guardar | Cabecera muestra snapshot anterior |
| E10b | Borrador y re-guardar tras cambio cliente | Guardar borrador de nuevo | Snapshot del cliente se actualiza al guardar |
| E11 | Proforma exportada y cambio en catálogo/cliente | Exportar → cambiar maestros → ver/re-exportar | PDF/Excel y vista usan snapshot congelado |
| E12 | Rubro sin categoría en proforma | Línea manual sin categoría en detalle | Se muestra descripción/código; sin agrupación de categoría en cabecera de línea |
| E13 | Proforma con muchas líneas (2+ páginas PDF) | Borrador con 40+ rubros → exportar PDF | PDF multipágina; totales coherentes con calculador backend |
| E14 | Editar proforma exportada | `PATCH /proformas/{id}` con status EXPORTED | **400 Bad Request** — no editable |
| E15 | Papelera: eliminar permanentemente | `DELETE /proformas/trash/{id}` solo si está en papelera | **204**; desaparece de trash; detalle en cascada eliminado |
| E16 | Papelera: eliminar activa sin pasar por trash | `DELETE /proformas/trash/{id}` sobre proforma activa | **404** — solo papelera |
| E17 | Restaurar desde papelera | `PATCH /proformas/{id}/restore` | Vuelve al historial con mismo contenido |
| E18 | Monkey testing (exploratorio) | Herramienta tipo Gremlins o clics aleatorios 5 min en PWA | Sin pantalla en blanco; errores mostrados en toast |

---

## Concurrencia real (E1)

SQLite en un solo proceso **serializa escrituras**; dos peticiones simultáneas raramente corrompen datos, pero la segunda debe fallar con **409** si el ID ya existe. En despliegues multi-instancia futuros convendría bloqueo optimista o transacción explícita.

---

## Valoración de esfuerzo de prueba

| Tipo | Horas estimadas (referencia profesional) |
|------|------------------------------------------|
| Script automatizado `test-edge-cases.ps1` | 2–3 h (incluye mantenimiento) |
| Matriz manual E1–E18 | 4–6 h primera pasada |
| Monkey testing exploratorio | 1–2 h por iteración |
| Regresión antes de cada release | 1 h (script + smoke PWA) |

---

## Referencias en código

- Duplicados / exportadas: `proformas.service.ts` → `assertIdAvailableForCreate`, `update`
- Papelera: `remove`, `restore`, `permanentRemove`
- IDs secuenciales: `proforma-id.helper.ts`
- Categorías: `categories.service.ts` → `remove`
