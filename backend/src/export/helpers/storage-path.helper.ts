import { dirname, join } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';

/** Caracteres problemáticos en rutas de Windows y Linux */
const INVALID_PATH_CHARS = /[<>:"|?*\u0000-\u001f]/g;

/**
 * Obtiene el directorio raíz de almacenamiento de proformas.
 * En producción: variable PROFORMAS_STORAGE_PATH (montaje Docker del NAS).
 * En desarrollo: {dataDir}/proformas/
 */
export function getProformasStorageRoot(): string {
  if (process.env.PROFORMAS_STORAGE_PATH) {
    return process.env.PROFORMAS_STORAGE_PATH;
  }

  // Fallback desarrollo: junto a la base de datos
  const databasePath =
    process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'construproformas.db');
  return join(dirname(databasePath), 'proformas');
}

/**
 * Sanitiza un texto para usarlo como componente de ruta de carpeta.
 * Elimina caracteres inválidos (Windows + Linux) y recorta espacios.
 */
export function sanitizeFolderName(text: string): string {
  return text
    .replace(INVALID_PATH_CHARS, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim()
    .slice(0, 150); // Limita longitud para evitar rutas excesivamente largas
}

/**
 * Extrae el año del ID de proforma (CM_PROF-200-2026 → 2026).
 * Si no se puede extraer, usa el año actual.
 */
export function extractYearFromId(idProforma: string): number {
  const match = idProforma.match(/-(\d{4})$/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

/**
 * Construye la ruta de carpeta para una proforma específica:
 * {storageRoot}/PROFORMAS {AÑO}/{ID} {nombreProyecto}/
 *
 * Ejemplo:
 *   /app/storage/proformas/PROFORMAS 2026/CM_PROF-200-2026 PROFORMA ESTUDIOS DE SUELOS/
 */
export function buildProformaFolderPath(
  idProforma: string,
  nombreProyecto: string,
): string {
  const root = getProformasStorageRoot();
  const year = extractYearFromId(idProforma);
  const yearFolder = `PROFORMAS ${year}`;

  const safeId = sanitizeFolderName(idProforma);
  const safeName = sanitizeFolderName(nombreProyecto);
  const folderName = safeName ? `${safeId} ${safeName}` : safeId;

  return join(root, yearFolder, folderName);
}

/**
 * Crea la carpeta de la proforma si no existe.
 * Retorna la ruta absoluta de la carpeta.
 */
export function ensureProformaFolder(
  idProforma: string,
  nombreProyecto: string,
): string {
  const folderPath = buildProformaFolderPath(idProforma, nombreProyecto);
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

/**
 * Determina el siguiente nombre de versión para un archivo si ya existe.
 *
 * Lógica:
 * - Si el archivo no existe → retorna el nombre base.
 * - Si existe → busca el mayor sufijo _V{n} ya existente y retorna _V{n+1}.
 *
 * Ejemplo:
 *   "CM_PROF-200-2026 ESTUDIO.pdf" existe → "CM_PROF-200-2026 ESTUDIO_V2.pdf"
 *   "_V2.pdf" ya existe → "_V3.pdf"
 */
export function resolveVersionedFilename(
  folderPath: string,
  baseFilename: string,
): string {
  const dotIndex = baseFilename.lastIndexOf('.');
  const nameWithoutExt =
    dotIndex > -1 ? baseFilename.slice(0, dotIndex) : baseFilename;
  const ext = dotIndex > -1 ? baseFilename.slice(dotIndex) : '';

  const targetPath = join(folderPath, baseFilename);
  if (!existsSync(targetPath)) {
    return baseFilename; // No existe → sin versión
  }

  // Encuentra el número de versión más alto existente
  let maxVersion = 1;
  try {
    const files = readdirSync(folderPath);
    const versionPattern = new RegExp(
      `^${escapeRegExp(nameWithoutExt)}_V(\\d+)${escapeRegExp(ext)}$`,
    );
    for (const file of files) {
      const match = file.match(versionPattern);
      if (match) {
        const v = parseInt(match[1], 10);
        if (v > maxVersion) maxVersion = v;
      }
    }
  } catch {
    // Si no se puede leer el directorio, usamos V2 por defecto
  }

  return `${nameWithoutExt}_V${maxVersion + 1}${ext}`;
}

/** Escapa caracteres especiales de regex en un string literal */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ProformaFileEntry {
  filename: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string; // ISO 8601
  absolutePath: string;
}

/**
 * Lista todos los archivos (.pdf, .xlsx) dentro de la carpeta de una proforma.
 * Retorna lista vacía si la carpeta no existe.
 */
export function listProformaFiles(
  idProforma: string,
  nombreProyecto: string,
): ProformaFileEntry[] {
  const folderPath = buildProformaFolderPath(idProforma, nombreProyecto);

  if (!existsSync(folderPath)) {
    return [];
  }

  try {
    const files = readdirSync(folderPath);
    const results: ProformaFileEntry[] = [];

    for (const filename of files) {
      const lower = filename.toLowerCase();
      if (!lower.endsWith('.pdf') && !lower.endsWith('.xlsx')) continue;

      const absolutePath = join(folderPath, filename);
      try {
        const stat = statSync(absolutePath);
        results.push({
          filename,
          extension: lower.endsWith('.pdf') ? 'pdf' : 'xlsx',
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          absolutePath,
        });
      } catch {
        // Skip archivos que no se puedan leer
      }
    }

    // Ordenar: más reciente primero
    results.sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    );

    return results;
  } catch {
    return [];
  }
}

/**
 * Directorio legacy de exportaciones planas (data/exports/).
 * Se mantiene para backward compatibility con archivos exportados antes de la Fase 2.
 */
export function getExportsDirectory(): string {
  const databasePath =
    process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'construproformas.db');
  const exportsDir = join(dirname(databasePath), 'exports');

  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }

  return exportsDir;
}
