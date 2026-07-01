# Manual de usuario y reglas de negocio — Versión 2.0 (borrador)

Documento operativo para Construproformas (Construmétrica). Complementa el [Manual técnico](./MANUAL_TECNICO.md) y la [matriz de casos extremos](./EDGE_CASES_V2.md).

---

## 1. Propósito de la aplicación

Construproformas permite elaborar, guardar, exportar y archivar **proformas de obra** usando clientes y rubros previamente registrados. Está orientada a uso **mobile-first** (PWA) con backend centralizado en la nube.

---

## 2. Flujo para crear una proforma

1. **Registrar o seleccionar un cliente** en *Clientes* (nombre, RUC/cédula, contacto).
2. **Verificar rubros** en *Catálogo de rubros* y *Categorías* (cargados al iniciar el sistema desde Excel en el servidor).
3. Ir a **Nueva proforma**, completar cabecera (proyecto, cliente, perfil emisor, fecha).
4. Agregar líneas de detalle desde el catálogo o manualmente.
5. **Guardar borrador** en el servidor (estado `DRAFT`).
6. Cuando esté listo, **exportar** a PDF y Excel desde el historial.

> **Regla de congelamiento (V2.0.1):** Al **guardar** un borrador, el sistema copia en la proforma los datos del cliente (`clienteNombre`, RUC, dirección, teléfono) y cada línea de rubro con sus valores numéricos. **Cambios posteriores** en *Clientes* o *Catálogo* **no modifican** una proforma ya guardada hasta que el usuario **vuelva a guardar** el borrador. Las proformas **exportadas** quedan congeladas permanentemente.

---

## 2.1. Categorías y catálogo de rubros

| Acción | Comportamiento |
|--------|----------------|
| **Eliminar categoría sin rubros** | Se elimina sin error. |
| **Eliminar categoría con rubros asociados** | **Bloqueado (409).** Debe reasignar los rubros a otra categoría desde *Catálogo* antes de eliminar. |
| **Editar precio/unidad de un rubro en catálogo** | No altera líneas ya guardadas en proformas existentes. |
| **Eliminar rubro del catálogo** | No elimina líneas ya guardadas en proformas. |

---

## 3. Reglas de exportación y bloqueo de edición

| Regla | Detalle |
|-------|---------|
| **Al exportar, la proforma deja de ser editable** | El backend cambia el estado a `EXPORTED`. Cualquier intento de modificación recibe error. |
| **Motivo** | Evitar que cambios posteriores en clientes o rubros alteren proformas ya entregadas (trazabilidad). |
| **Qué puede hacer el usuario** | Ver en solo lectura, clonar como nuevo borrador, descargar PDF/Excel generados. |
| **Qué no puede hacer** | Editar líneas, cambiar totales ni cabecera de una proforma exportada. |
| **Re-exportar** | Usa los mismos valores congelados (cliente + rubros) del documento; no lee datos vivos del maestro. |
| **Vista solo lectura** | Muestra el snapshot guardado, no los cambios recientes en *Clientes*. |

En la pantalla de edición, las proformas exportadas muestran un aviso de **solo lectura**.

---

## 4. Reglas de eliminación (papelera)

| Paso | Acción | Efecto |
|------|--------|--------|
| 1 | **Eliminar** desde *Historial de proformas* | *Soft delete*: la proforma pasa a **Papelera** |
| 2 | En **Papelera** | Restaurar **o** eliminar permanentemente |
| 3 | **Eliminar permanentemente** | Borrado definitivo de **una en una** (confirmación doble). Libera el ID para uso futuro. |

- Las proformas en papelera **no aparecen** en el historial principal.
- Un ID en papelera **no puede reutilizarse** hasta restaurarlo o eliminarlo permanentemente.
- La eliminación permanente **no se puede deshacer**.

---

## 5. Descarga de archivos exportados

Tras exportar, el sistema genera PDF y Excel en el servidor. El usuario puede:

- Descargarlos automáticamente al exportar (borradores).
- Volver a descargarlos desde el historial (proformas ya exportadas).

---

## 6. Alcance técnico de esta versión (2.0)

| Funcionalidad | Estado en V2.0 |
|---------------|----------------|
| API REST + SQLite | ✅ Producción (Railway) |
| PWA en Cloudflare Pages | ✅ |
| Seed de catálogo desde Excel al arrancar | ✅ |
| Exportación PDF/Excel | ✅ |
| Papelera + restauración + borrado permanente | ✅ |
| PIN de acceso cliente (PWA) | ✅ |
| API Key servidor | ✅ |
| **Sincronización con NAS** | ❌ No contemplada en esta versión |
| **Trabajo offline completo** | ⚠️ Parcial (cola de borradores); no sustituye NAS |
| Autenticación multi-usuario / roles | ❌ Pendiente (V2.1+) |
| Cifrado de datos en reposo | ❌ Pendiente evaluación |

---

## 7. Seguridad (resumen para el usuario)

- El acceso a la PWA requiere **PIN** configurado en el despliegue.
- Las peticiones al API requieren **clave de API** (`X-API-KEY`).
- Los datos viajan por **HTTPS** en producción.
- No comparta PIN ni claves API por canales inseguros.

Detalle de vulnerabilidades npm y hardening: ver punto 21 del alcance V2 (pendiente de auditoría formal).

---

## 8. Valoración de costos (referencia profesional V2.0)

Estimación orientativa del alcance documentado en este manual y los puntos 3, 14, 16 y 20 del PDF de alcance:

| Ítem | Horas | Notas |
|------|-------|-------|
| Corrección identidad PWA / despliegue (punto 3) | 1–2 h | Incluye meta tags, manifest, docs |
| Matriz + script casos extremos (punto 14) | 6–10 h | Automatizado + manual + mantenimiento |
| Borrado permanente en papelera (punto 16) | 3–5 h | Backend + UI + pruebas |
| Manual y reglas de negocio (punto 20) | 4–6 h | Este documento + alineación con código |
| **Subtotal puntos 3/14/16/20** | **14–23 h** | Tarifa según contrato Construmétrica |

Costos operativos mensuales (indicativos): Railway + Cloudflare Pages free/low tier — revisar según tráfico y volumen SQLite.

---

## 9. Glosario breve

| Término | Significado |
|---------|-------------|
| **Borrador (DRAFT)** | Proforma editable, no exportada |
| **Exportada (EXPORTED)** | Proforma bloqueada tras generar PDF/Excel |
| **Papelera** | Proformas con borrado lógico (`deletedAt`) |
| **Soft delete** | Oculta del historial sin borrar fila física |
| **Hard delete** | Eliminación permanente desde papelera |

---

## 10. Historial de cambios del documento

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-06 | 2.0.1 | Snapshot cliente en proforma, fix eliminar categoría, reglas congelamiento |
| 2026-06 | 2.0-draft | Reglas exportación, papelera, borrado permanente, alcance NAS/offline, edge cases |
