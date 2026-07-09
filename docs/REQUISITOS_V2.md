# Documento de Requerimientos de Software — Construproformas V2.0

**Cliente:** Construmétrica — Ingeniería Civil  
**Versión del Documento:** 1.0  
**Fecha:** 8 de julio de 2026  

---

## 1. Introducción y Contexto de Negocio

Construproformas es una plataforma diseñada para automatizar y optimizar la generación, gestión y exportación de proformas de obra para la empresa **Construmétrica**. La aplicación reduce la carga mental y el tiempo requerido por la gerencia para cotizar servicios de ingeniería civil (principalmente topografía, replanteo, alquiler de equipos, entre otros) tanto en el sector público como en el privado.

La aplicación está diseñada bajo un enfoque **mobile-first** y funciona como una PWA (Progressive Web App) offline-first para la gerencia, conectándose a una API REST construida con NestJS y SQLite desplegada localmente o en un servidor NAS corporativo.

---

## 2. Requerimientos Funcionales (RF)

A continuación se detallan los requerimientos funcionales de la versión 2.0 del sistema, numerados según el análisis de alcance y alineados con las definiciones de negocio acordadas:

### RF-01: Buscador y Filtros en Historial de Proformas
* **Descripción:** Se debe optimizar el historial de proformas implementando una carga de datos bajo demanda basada en filtros de búsqueda.
* **Detalle:**
  * Se añadirá un botón **Buscar** en la sección de filtros.
  * Los datos del historial solo se cargarán después de que el usuario pulse este botón, evitando consultas innecesarias en cada pulsación de tecla o carga de página.
  * **Diseño Responsivo:** En la vista móvil, el botón "Buscar" se posicionará verticalmente debajo del filtro de fecha ("Fecha hasta").

### RF-02: Exportación Dual Directa (PDF / Excel)
* **Descripción:** Se optimizará el flujo de descarga de proformas en el historial de acciones.
* **Detalle:**
  * Se reemplazará el botón único de exportación genérico por dos opciones claras:
    * **Exportar a Excel:** Botón verde.
    * **Exportar a PDF:** Botón rojo o naranja (para diferenciarlo visualmente del botón "Eliminar", que es de color rojo).
  * *Alternativa:* Se puede implementar un menú desplegable limpio junto a la proforma que permita elegir el formato deseado (`.pdf` o `.xlsx`).

### RF-03: Nombre de la Aplicación (Tab/Cabecera)
* **Descripción:** El nombre visual de la aplicación en las pestañas del navegador o ventanas desplegadas debe ser uniforme.
* **Detalle:**
  * Corregir el texto de la pestaña/acceso del navegador a **construproformas** (todo en minúsculas), corrigiendo cualquier mayúscula incorrecta.

### RF-04: Menú de Navegación Descriptivo
* **Descripción:** Se cambiará la etiqueta del menú lateral para mejorar la claridad de uso de la aplicación.
* **Detalle:**
  * Cambiar el texto de la opción "Historial" en el menú de navegación a **"Historial de proformas"**.

### RF-05: Comportamiento de Edición en Valores Numéricos
* **Descripción:** Facilitar la edición rápida de celdas numéricas en las tablas del catálogo y de la proforma.
* **Detalle:**
  * Al hacer clic y borrar un valor numérico (como cantidad, costo unitario o porcentaje de IVA), el sistema debe permitir borrar todo el campo (dejarlo vacío temporalmente).
  * Se debe eliminar el comportamiento que fuerza un `0` por defecto al inicio de la edición, permitiendo escribir el nuevo valor directamente.

### RF-06: Autocompletado Ágil de Rubros
* **Descripción:** Optimizar el componente de autocompletado en el detalle de la proforma.
* **Detalle:**
  * El sistema sugerirá coincidencias de rubros desde la **primera letra** ingresada por el usuario (en lugar del mínimo de 3 caracteres actual).
  * Los resultados sugeridos se limitarán a un máximo de 10 coincidencias, ordenadas alfabéticamente o priorizando los rubros más recientemente utilizados para garantizar un rendimiento óptimo en dispositivos móviles.

### RF-07: Sincronización Inmediata de Cálculos de Totales (Sin Retardo)
* **Descripción:** Corregir el retardo de renderizado en la tabla de rubros al modificar cantidades o precios.
* **Detalle:**
  * Asegurar que al modificar una línea (por ejemplo, 10 unidades a $40), la interfaz actualice visualmente el total de la línea ($400) y los totales generales de manera instantánea, eliminando cualquier delay visual percibido.

### RF-08: Previsualización de Proforma antes del Bloqueo (Feedback)
* **Descripción:** Permitir al usuario validar los datos introducidos antes de congelar y bloquear la proforma.
* **Detalle:**
  * Debido a que la exportación cambia el estado de la proforma a `EXPORTED` (bloqueando permanentemente su edición por razones de auditoría), se implementará una funcionalidad de **Vista Previa**.
  * El usuario podrá ver la proforma tal como saldrá en el PDF/Excel final directamente en la aplicación sin necesidad de descargar el archivo.

### RF-09: Cliente Genérico ("A quien interese")
* **Descripción:** Permitir la creación rápida de proformas para clientes que no proporcionan datos de contacto.
* **Detalle:**
  * Se añadirá una casilla de selección (checkbox/checklist) rotulada como **"A quien interese"** arriba del campo de texto de nombre del cliente.
  * Al marcarla, se autocompletarán automáticamente los siguientes datos no editables en la cabecera:
    * **Nombre del Cliente:** `A quien interese`
    * **Cédula / RUC:** `1000000000`
    * **Teléfono:** `0999999999`
  * Este registro de identificación `1000000000` se exceptuará de cualquier regla de validación algorítmica de identificación.

### RF-10: Notas Dinámicas tipo Viñeta en Proforma
* **Descripción:** Flexibilizar la sección de notas de la proforma sin incurrir en la sobrecarga de un CRUD maestro de notas.
* **Detalle:**
  * Se implementará un formulario en la proforma que permita agregar y remover filas de texto de manera dinámica (cada fila representa un punto o viñeta en el PDF/Excel).
  * Para agilizar la escritura, el input de notas ofrecerá sugerencias de autocompletado basadas en las notas que el usuario ha redactado en proformas anteriores.

### RF-11: Diseño del Documento PDF (Encuadre y Márgenes)
* **Descripción:** Ajustar el formato estético del PDF exportado de acuerdo a los estándares institucionales de Construmétrica.
* **Detalle:**
  * **Encuadre:** Toda la proforma debe renderizarse dentro de un marco o cuadro con contorno negro continuo.
  * **Márgenes:** Se fijarán márgenes de 4 cm por cada lado del documento.
  * **Logotipo:** El logotipo corporativo de Construmétrica en la cabecera debe alinearse de manera exacta con el borde derecho/superior de la tabla de detalles de la proforma.

### RF-12: Gestión Controlada de Papelera (Borrado Seguro)
* **Descripción:** Evitar pérdidas accidentales de datos en el historial y papelera.
* **Detalle:**
  * Las proformas eliminadas del historial pasan a un estado de *Soft Delete* (Papelera).
  * En la Papelera, las proformas **únicamente se podrán eliminar permanentemente de una en una** y tras una doble confirmación del usuario.
  * **Restricción:** No se implementará un botón de "Vaciar papelera" para evitar eliminaciones masivas accidentales.

### RF-13: Categoría por Defecto ("Otros rubros") [Prioridad Media-Baja]
* **Descripción:** Asegurar que todos los rubros del catálogo tengan una categoría asignada.
* **Detalle:**
  * Se creará una categoría por defecto del sistema llamada **"Otros rubros"**, la cual no podrá ser eliminada por el usuario.
  * Cualquier rubro que se cree sin categoría, o cuyo seed en la base de datos carezca de la misma, se moverá automáticamente a esta categoría.
  * *(Nota de negocio: Puede postergarse a futuro, pero queda especificada para mantener coherencia en el catálogo)*.

### RF-14: Paginación y Filtrado del Catálogo de Rubros
* **Descripción:** Mejorar la navegabilidad del catálogo de rubros ante un crecimiento del volumen de datos (actualmente 98 rubros).
* **Detalle:**
  * Se agregará un sistema de filtros en la vista de catálogo: por categoría y ordenamiento (por código, descripción o costo unitario).
  * Se paginarán los rubros permitiendo vistas de 10 en 10, 20 en 20, o la opción de "Mostrar todos".

---

## 3. Requerimientos No Funcionales (RNF) y Seguridad

### RNF-01: Seguridad en Repositorios (Auditoría NPM)
* **Descripción:** Evaluar y asegurar el software frente a vulnerabilidades en dependencias públicas de Node.
* **Detalle:**
  * Se correrá de forma periódica `npm audit` tanto en `frontend/` como en `backend/` para identificar fallos de seguridad y actualizar paquetes obsoletos que expongan datos.

### RNF-02: Cifrado de Información y Base de Datos
* **Descripción:** Salvaguardar costos de rubros, márgenes y datos de clientes frente a accesos no autorizados en el servidor.
* **Detalle:**
  * **Cifrado en Tránsito:** Es obligatorio el uso de protocolos HTTPS para la comunicación entre la PWA y la API desplegada en Railway/NAS.
  * **Cifrado en Reposo (Recomendación Técnica):** Dado que la base de datos SQLite vive en un solo archivo físico en el servidor NAS, se recomienda restringir los permisos de lectura/escritura del directorio del volumen de Docker a nivel del sistema operativo local. El cifrado de base de datos nativo (como SQLCipher) se evalúa a futuro si el entorno físico del servidor es compartido con personal no autorizado.

### RNF-03: Cambio de PIN Seguro para Administrador
* **Descripción:** Mantener la seguridad del acceso local sin complicar la experiencia de usuario.
* **Detalle:**
  * Se conservará el sistema de acceso mediante PIN.
  * Se proveerá una sección de configuración dentro de la aplicación donde el administrador pueda cambiar el PIN de acceso, validando que cumpla con los requisitos mínimos de seguridad.

---

## 4. Matriz de Casos Extremos a Probar (Edge Cases)

Para garantizar la robustez del sistema en producción local y NAS, se ejecutarán las siguientes pruebas:
1. **Concurrencia en Creación:** Dos usuarios intentan crear una proforma con el mismo ID de forma simultánea. El backend debe rechazar la segunda petición con un código `409 Conflict` y el frontend sugerir el siguiente ID disponible.
2. **Reutilización de IDs:** Si se elimina permanentemente una proforma con ID `CM-PROF-10`, el sistema debe permitir registrar una nueva proforma con ese ID para no dejar huecos secuenciales.
3. **Escalabilidad de Clientes:** Carga de prueba de 1000 clientes en la base de datos para validar que el buscador autocompleta fluidamente sin congelar la interfaz.
4. **Modificación de Maestros:** Modificar un rubro o cliente en el catálogo de maestros y asegurar que las proformas en estado `DRAFT` conserven su snapshot hasta que se vuelvan a guardar activamente, y las proformas en estado `EXPORTED` nunca alteren sus valores.
