# Manual de Requerimientos de Software (SRS) — Sistema Construproformas

**Cliente:** Construmétrica — Ingeniería Civil  
**Versión del Documento:** 2.0 (Unificado)  
**Fecha:** 8 de julio de 2026  

---

## 1. Introducción y Propósito del Sistema

El sistema **Construproformas** es una plataforma de software diseñada para digitalizar, estandarizar y automatizar el proceso de estimación, elaboración y exportación de proformas de obra para la empresa **Construmétrica** (Ingeniería Civil). 

El objetivo primordial del sistema es mitigar la carga mental, disminuir los tiempos operativos en la toma de decisiones financieras y centralizar los históricos de cotizaciones de la empresa, prestando especial atención a sus dos líneas principales de negocio: la topografía y los servicios afines en los sectores público y privado.

---

## 2. Arquitectura General y Tecnologías

El sistema se compone de dos aplicaciones principales, diseñadas para un despliegue local o corporativo en servidores NAS:

*   **Backend (NestJS API):** Una API REST robusta construida con NestJS y TypeScript. Utiliza una base de datos relacional ligera **SQLite** de archivo único (`construproformas.db`) y la librería TypeORM. Proporciona seguridad básica por cabecera `X-API-KEY`.
*   **Frontend (React Web / PWA):** Una aplicación cliente web construida con React, TypeScript y Vite. Diseñada bajo un enfoque **mobile-first** para el uso exclusivo de la gerencia, que soporta instalación local como Progressive Web App (PWA) y funcionamiento offline a través de IndexedDB.
*   **Contenedorización (Docker):** El despliegue de base se realiza mediante Docker Compose para garantizar portabilidad en servidores NAS.

---

## 3. Modelo de Dominio y Reglas de Negocio Clave

El núcleo operativo de Construproformas gira alrededor de las siguientes entidades e interacciones:

```
                  ┌──────────────┐
                  │   Perfiles   │
                  │   (Emisor)   │
                  └──────┬───────┘
                         │ 1
                         │
                         ▼
┌──────────────┐ 1    * ┌──────────────┐ *    1 ┌──────────────┐
│   Clientes   ├───────►│  Proformas   │◄───────┤ Categorías   │
└──────────────┘        └──────┬───────┘        └──────┬───────┘
                               │ 1                     │ 1
                               │                       │
                               ▼ *                     ▼ *
                        ┌──────────────┐        ┌──────────────┐
                        │   Detalles   │        │ Catálogo de  │
                        │ (Rubro/Línea)│        │   Rubros     │
                        └──────────────┘        └──────────────┘
```

### 3.1. Regla de Congelamiento de Datos (Auditoría)
*   **Borradores (DRAFT):** Al guardar una proforma en estado borrador, se copia en el registro la información de la cabecera del cliente (Nombre, RUC, dirección, teléfono) y el costo unitario/unidad de cada rubro en ese instante. Cambios posteriores en los maestros no afectarán el borrador a menos que el usuario vuelva a guardar activamente.
*   **Exportadas (EXPORTED):** En el momento en que se genera y exporta el archivo PDF o Excel, la proforma cambia su estado a `EXPORTED` y **queda bloqueada permanentemente para edición**. Cualquier intento de actualización por API o interfaz generará un error de conflicto. Las descargas o visualizaciones posteriores usarán estrictamente el snapshot guardado históricamente.

### 3.2. Reglas de Cálculo en el Servidor (Single Source of Truth)
El cálculo de montos financieros nunca se confía al cliente (frontend). El backend ejecuta la siguiente lógica en cada guardado:
1.  **Total por Línea:** `Cantidad × Costo Unitario` (redondeado a 2 decimales).
2.  **IVA por Línea:** `Total de Línea × (Porcentaje de IVA / 100)`. El porcentaje de IVA se define por línea (default 15% para Ecuador, o 0% si aplica exención).
3.  **Subtotal Proforma:** Suma de los totales de cada línea (excluyendo IVA).
4.  **IVA Total:** Suma de los montos de IVA de cada línea.
5.  **Total General:** `Subtotal + IVA Total`.
6.  **Monto Contrato:** Equivalente al Total General.
7.  **Tiempo de Ejecución:** Suma acumulada del campo `Días Laborables` de todas las líneas asociadas a la proforma.

---

## 4. Requerimientos Funcionales (RF)

### 4.1. Módulo de Gestión de Clientes
*   **RF-01: CRUD de Clientes:** Permitir el registro, edición, visualización y eliminación lógica de clientes con campos: Nombre del Cliente, RUC/Cédula (único en el sistema), Dirección y Teléfono (opcional).
*   **RF-02: Restricción de Eliminación:** El sistema impedirá eliminar físicamente a un cliente que tenga proformas asociadas en el sistema (retornando código `409 Conflict`).
*   **RF-03: Buscador de Clientes:** Autocompletado ágil en tiempo real mediante coincidencia parcial (LIKE) en campos de Nombre o RUC/Cédula.

### 4.2. Módulo de Catálogo de Rubros y Categorías
*   **RF-04: CRUD de Rubros:** Permitir la gestión de ítems cotizables del catálogo, con campos: Código sugerido, Descripción (rubro de obra), Unidad de medida (m2, u, global, etc.), Costo Unitario, Porcentaje de IVA por defecto y Categoría asociada.
*   **RF-05: Seed desde Excel:** El backend incluye un script idempotente de carga inicial (`seed`) para registrar el catálogo oficial de Construmétrica desde un archivo Excel (`productos.xlsx`).
*   **RF-06: Gestión de Categorías:** CRUD de categorías de rubros. No se permite eliminar una categoría que tenga rubros asociados.
*   **RF-07: Paginación, Filtros y Búsqueda de Rubros:** La interfaz del catálogo de rubros debe permitir:
    *   Filtrar los ítems por Categoría.
    *   Ordenar por código, descripción o costo unitario.
    *   Paginar las listas de 10 en 10, 20 en 20, o elegir "Mostrar todos" para evitar ralentizaciones del navegador con listas extensas.
*   **RF-08: Categoría por Defecto "Otros rubros":** Debe existir una categoría del sistema llamada "Otros rubros", la cual no es eliminable. Todo rubro que sea creado sin una categoría explícita se asignará automáticamente a esta categoría.

### 4.3. Módulo de Creación y Edición de Proformas
*   **RF-09: Identificador Secuencial (next-id):** El sistema sugiere automáticamente el siguiente ID secuencial de proforma (ej. `CM-PROF-90`), pero permite al usuario editarlo. No se permiten IDs duplicados.
*   **RF-10: Cliente Genérico ("A quien interese"):** Para cotizaciones rápidas donde no se tienen los datos del cliente, existirá un checkbox "A quien interese" arriba del selector de cliente. Al activarlo, se autocompletará y bloqueará:
    *   *Nombre del Cliente:* `A quien interese`
    *   *RUC / Cédula:* `1000000000` (exceptuado de validaciones de formato)
    *   *Teléfono:* `0999999999`
*   **RF-11: Autocompletado de Rubros desde el Detalle:** Al agregar líneas en la proforma, el buscador de rubros sugerirá coincidencias desde la **primera letra** ingresada, ordenando los resultados y limitándolos a 10 coincidencias para fluidez.
*   **RF-12: Comportamiento Fluido de Edición Numérica:** Al posicionar el cursor sobre un campo numérico editable de la tabla de detalles (Cantidad, Costo, IVA, Días), el usuario podrá borrar por completo el contenido de la celda (dejándolo vacío) sin que el sistema fuerce un `0` inicial de manera inmediata.
*   **RF-13: Recálculo Instantáneo en Pantalla:** Al editar cantidad o costo en el detalle de la proforma, la interfaz recalculará los totales de la línea y el subtotal de manera inmediata en el cliente sin retardos visuales.
*   **RF-14: Gestión de Notas Dinámicas:** La proforma dispondrá de una sección para agregar o remover líneas de notas en formato de lista de viñetas (bullets). Al escribir una nota, el sistema sugerirá oraciones utilizadas en proformas previas.
*   **RF-15: Clonación de Proformas:** Se permitirá duplicar cualquier proforma del historial. El sistema generará una copia idéntica en estado `DRAFT` y le asignará un nuevo ID secuencial.

### 4.4. Historial, Exportación y Papelera
*   **RF-16: Historial de Proformas con Búsqueda Activa:** Se dispondrá de un listado histórico con filtros por ID, Proyecto, Cliente y Rango de Fechas. La búsqueda y filtrado de datos se ejecutará **únicamente al pulsar un botón "Buscar"**. En la versión móvil, este botón se ubicará abajo de los filtros de fecha.
*   **RF-17: Previsualización de Proformas:** Se integrará una vista previa interactiva en pantalla de la proforma antes de ser exportada, permitiendo al usuario validar la estructura del documento y evitar exportaciones incorrectas que bloqueen la edición.
*   **RF-18: Exportación Dual Directa:** En la columna de acciones del historial, se dispondrá de dos botones claros:
    *   **Exportar a Excel:** Botón de color verde para descargar el archivo `.xlsx`.
    *   **Exportar a PDF:** Botón de color rojo o naranja para descargar el archivo `.pdf`.
*   **RF-19: Formato Estético de PDF (Encuadre y Márgenes):** El documento PDF generado debe contar con:
    *   Márgenes fijos de 4 cm en los cuatro bordes de la página.
    *   Un encuadre perimetral formado por un contorno negro.
    *   Alineación exacta del logotipo de Construmétrica con el borde lateral derecho del cuadro de rubros.
*   **RF-20: Papelera de Reciclaje (Borrado Seguro):** Al borrar una proforma, esta pasará a la sección "Papelera" (Soft Delete).
    *   Desde la papelera, el usuario podrá restaurar el borrador o eliminarlo permanentemente.
    *   La eliminación permanente se hará **de una en una** con doble mensaje de confirmación.
    *   *Queda prohibido implementar un botón de "Vaciar papelera" global.*

### 4.5. Operación en Modo Offline (PWA)
*   **RF-21: Trabajo sin Conexión:** Si el navegador detecta pérdida de conexión, el usuario podrá seguir creando proformas.
    *   Los borradores locales se almacenarán temporalmente en IndexedDB.
    *   Un indicador de estado ("En línea" / "Sin conexión") se mostrará en el header de la aplicación.
    *   Al recuperar la conexión, la PWA ejecutará automáticamente un proceso de sincronización en lote (`POST /api/proformas/sync`) para volcar los borradores al servidor.

---

## 5. Requerimientos No Funcionales (RNF)

*   **RNF-01: Rendimiento del Cliente:** La interfaz debe ser responsive (mobile-first), asegurando tiempos de carga iniciales menores a 2 segundos en redes locales LAN.
*   **RNF-02: Persistencia Segura:** El backend debe mantener la integridad referencial en SQLite y realizar guardados atómicos por transacción.
*   **RNF-03: Despliegue Dockerizado:** El sistema debe compilarse en una imagen Docker multi-etapa basada en Node-Alpine, aislando recursos de base de datos y archivos generados bajo `/app/data`.

---

## 6. Seguridad y Hardening

*   **RNF-04: Protección de API:** Todas las rutas del backend requieren la cabecera `X-API-KEY` cargada desde el entorno, a excepción del endpoint público de diagnóstico `/api/health`.
*   **RNF-05: Control de Acceso Local (PIN):** El ingreso a la interfaz frontend (PWA) está restringido mediante un PIN de acceso configurado localmente.
*   **RNF-06: Gestión de PIN por Administrador:** La aplicación dispondrá de un panel de configuración segura donde el administrador podrá modificar el PIN de ingreso de la PWA. El PIN deberá validar una longitud y caracteres seguros.
*   **RNF-07: Auditoría de Dependencias (NPM):** Periódicamente se debe ejecutar `npm audit` para mitigar vulnerabilidades en librerías del backend o frontend, aplicando parches correspondientes.
*   **RNF-08: Cifrado y Seguridad de Datos:**
    *   **En Tránsito:** Las comunicaciones externas o fuera de la red local se realizarán estrictamente bajo protocolo HTTPS.
    *   **En Reposo:** Al ser SQLite una base de datos basada en archivos, se deben aplicar permisos restrictivos (`chmod 700` o equivalente) al directorio del volumen montado en el servidor NAS, de manera que solo el proceso del contenedor de Docker tenga lectura y escritura sobre el archivo `construproformas.db`.
