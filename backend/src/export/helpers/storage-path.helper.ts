import { dirname, join } from 'path';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmdirSync,
  statSync,
} from 'fs';

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
 * Busca todas las carpetas existentes que correspondan al ID de una proforma
 * dentro de PROFORMAS {año} (ej. 'CM-PROF-8 99999999', 'CM-PROF-8 ...').
 */
export function findExistingProformaFolders(idProforma: string): string[] {
  const root = getProformasStorageRoot();
  const year = extractYearFromId(idProforma);
  const yearFolder = join(root, `PROFORMAS ${year}`);

  if (!existsSync(yearFolder)) return [];

  const safeId = sanitizeFolderName(idProforma);
  try {
    const entries = readdirSync(yearFolder, { withFileTypes: true });
    return entries
      .filter((e) => {
        if (!e.isDirectory()) return false;
        return (
          e.name === safeId ||
          e.name.startsWith(`${safeId} `) ||
          e.name.startsWith(`${safeId}-`)
        );
      })
      .map((e) => join(yearFolder, e.name));
  } catch {
    return [];
  }
}

/**
 * Consolida cualquier carpeta duplicada/fragmentada de una proforma en una sola.
 * Si el usuario editó el proyecto y se creó otra carpeta, mueve todos los archivos
 * a la carpeta objetivo y limpia las carpetas viejas vacías.
 */
export function consolidateProformaFolder(
  idProforma: string,
  nombreProyecto?: string,
): string {
  const root = getProformasStorageRoot();
  const year = extractYearFromId(idProforma);
  const yearFolder = join(root, `PROFORMAS ${year}`);

  if (!existsSync(yearFolder)) {
    mkdirSync(yearFolder, { recursive: true });
  }

  const safeId = sanitizeFolderName(idProforma);
  const safeName = nombreProyecto ? sanitizeFolderName(nombreProyecto) : '';
  const idealFolderName = safeName ? `${safeId} ${safeName}` : safeId;
  const idealFolderPath = join(yearFolder, idealFolderName);

  const existingFolders = findExistingProformaFolders(idProforma);

  if (existingFolders.length === 0) {
    return idealFolderPath;
  }

  // Si ya existe la carpeta ideal, esa es la principal; si no, la primera existente
  const primaryFolder = existingFolders.includes(idealFolderPath)
    ? idealFolderPath
    : existingFolders[0];

  // Si hay más de una carpeta para este ID, mover todos los archivos a la principal
  for (const folder of existingFolders) {
    if (folder === primaryFolder) continue;

    try {
      const files = readdirSync(folder);
      for (const file of files) {
        const src = join(folder, file);
        const dst = join(primaryFolder, file);
        if (!existsSync(dst)) {
          renameSync(src, dst);
        }
      }
      try {
        rmdirSync(folder);
      } catch {
        // Ignorar si no se puede remover
      }
    } catch {
      // Ignorar errores en carpetas individuales
    }
  }

  // Si solo había una carpeta y el nombre ideal es diferente (se cambió el título),
  // intentamos renombrarla al nombre ideal para reflejar el título actual
  if (primaryFolder !== idealFolderPath && !existsSync(idealFolderPath) && safeName) {
    try {
      renameSync(primaryFolder, idealFolderPath);
      return idealFolderPath;
    } catch {
      return primaryFolder;
    }
  }

  return primaryFolder;
}

/**
 * Construye la ruta de carpeta para una proforma específica.
 */
export function buildProformaFolderPath(
  idProforma: string,
  nombreProyecto: string,
): string {
  return consolidateProformaFolder(idProforma, nombreProyecto);
}

/**
 * Crea la carpeta de la proforma si no existe.
 * Retorna la ruta absoluta de la carpeta.
 */
export function ensureProformaFolder(
  idProforma: string,
  nombreProyecto: string,
): string {
  const folderPath = consolidateProformaFolder(idProforma, nombreProyecto);
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

/**
 * Comprueba si un nombre de archivo pertenece a la proforma indicada:
 * 1. La extensión debe ser .xlsx o .pdf
 * 2. Debe iniciar con el ID de la proforma, seguido de un delimitador (' ', '_', '-', '.')
 *    para evitar falsos positivos (por ejemplo, que CM-PROF-2 coincida con CM-PROF-20).
 * 3. Tolera variantes históricas de guiones (CM_PROF vs CM-PROF).
 */
export function isProformaFile(filename: string, idProforma: string): boolean {
  const lower = filename.trim().toLowerCase();
  if (!lower.endsWith('.pdf') && !lower.endsWith('.xlsx')) {
    return false;
  }

  const rawId = idProforma.trim().toLowerCase();
  if (!rawId) return false;

  // Variantes de ID con guión bajo y guión medio
  const idVariants = new Set<string>([
    rawId,
    rawId.replace(/_/g, '-'),
    rawId.replace(/-/g, '_'),
    sanitizeFolderName(rawId).toLowerCase(),
  ]);

  for (const variant of idVariants) {
    if (lower.startsWith(variant)) {
      const rest = lower.slice(variant.length);
      // El siguiente caracter debe ser un delimitador o fin de nombre antes de extensión
      if (
        rest.length === 0 ||
        rest.startsWith(' ') ||
        rest.startsWith('-') ||
        rest.startsWith('_') ||
        rest.startsWith('.')
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extrae el número de versión de un nombre de archivo.
 * Ejemplos:
 *   "CM-PROF-200 - Casa_V2.pdf" -> 2
 *   "CM-PROF-200 - Casa_V10.xlsx" -> 10
 *   "CM-PROF-200 - Casa.pdf" -> 1
 */
export function extractVersionFromFilename(filename: string): number {
  const match = filename.match(/_V(\d+)\.[a-zA-Z0-9]+$/i);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Obtiene el número de versión más alto existente en la carpeta de la proforma
 * considerando tanto archivos Excel como PDF que correspondan a dicha proforma.
 */
export function getMaxVersionInFolder(
  folderPath: string,
  idProforma?: string,
): number {
  if (!existsSync(folderPath)) return 0;
  try {
    const files = readdirSync(folderPath);
    const supportedFiles = files.filter((f) => {
      if (idProforma) {
        return isProformaFile(f, idProforma);
      }
      const l = f.toLowerCase();
      return l.endsWith('.xlsx') || l.endsWith('.pdf');
    });
    if (supportedFiles.length === 0) return 0;

    let maxV = 1;
    for (const f of supportedFiles) {
      const v = extractVersionFromFilename(f);
      if (v > maxV) maxV = v;
    }
    return maxV;
  } catch {
    return 0;
  }
}

/**
 * Determina el siguiente nombre de versión para un archivo, garantizando que
 * Excel y PDF mantengan la misma versión coordinada para la proforma.
 */
export function resolveVersionedFilename(
  folderPath: string,
  baseFilename: string,
  targetVersion?: number,
  idProforma?: string,
): string {
  const dotIndex = baseFilename.lastIndexOf('.');
  const nameWithoutExt =
    dotIndex > -1 ? baseFilename.slice(0, dotIndex) : baseFilename;
  const ext = dotIndex > -1 ? baseFilename.slice(dotIndex).toLowerCase() : '';

  if (!existsSync(folderPath)) {
    return baseFilename;
  }

  // Si se provee una versión objetivo explícita, aplicarla directamente
  if (targetVersion !== undefined) {
    if (targetVersion <= 1) return `${nameWithoutExt}${ext}`;
    return `${nameWithoutExt}_V${targetVersion}${ext}`;
  }

  // Si no se especifica, calcular según la versión máxima actual de la proforma
  const maxExisting = getMaxVersionInFolder(folderPath, idProforma);
  if (maxExisting === 0) {
    return `${nameWithoutExt}${ext}`; // Primer archivo -> V1 (sin sufijo _V)
  }

  return `${nameWithoutExt}_V${maxExisting + 1}${ext}`;
}

export interface ProformaFileEntry {
  filename: string;
  extension: 'pdf' | 'xlsx';
  sizeBytes: number;
  modifiedAt: string; // ISO 8601
  absolutePath: string;
  version: number;
  isLatest: boolean;
}

/**
 * Lista todos los archivos (.pdf, .xlsx) que inicien con el ID de la proforma
 * dentro de su carpeta, incluyendo versiones anteriores, ordenados de más reciente a más antiguo.
 * Ignora archivos ajenos (ej. Word, pruebas sueltas o carpetas).
 */
export function listProformaFiles(
  idProforma: string,
  nombreProyecto?: string,
): ProformaFileEntry[] {
  const folderPath = consolidateProformaFolder(idProforma, nombreProyecto);

  const results: ProformaFileEntry[] = [];
  const visitedFilenames = new Set<string>();

  // 1. Leer archivos de la carpeta estructurada en el servidor
  if (existsSync(folderPath)) {
    try {
      const files = readdirSync(folderPath);
      for (const filename of files) {
        if (!isProformaFile(filename, idProforma)) continue;

        const absolutePath = join(folderPath, filename);
        try {
          const stat = statSync(absolutePath);
          if (!stat.isFile()) continue;

          const lower = filename.toLowerCase();
          const ext = lower.endsWith('.pdf') ? ('pdf' as const) : ('xlsx' as const);
          results.push({
            filename,
            extension: ext,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            absolutePath,
            version: extractVersionFromFilename(filename),
            isLatest: false,
          });
          visitedFilenames.add(filename);
        } catch {
          // Skip archivos que no se puedan leer
        }
      }
    } catch {
      // Skip
    }
  }

  // 2. Revisar archivos legacy en data/exports/ que pertenezcan a este ID
  try {
    const legacyDir = getExportsDirectory();
    if (existsSync(legacyDir)) {
      const legacyFiles = readdirSync(legacyDir);
      for (const legacyFile of legacyFiles) {
        if (!isProformaFile(legacyFile, idProforma)) continue;
        if (visitedFilenames.has(legacyFile)) continue;

        const legacyPath = join(legacyDir, legacyFile);
        try {
          const stat = statSync(legacyPath);
          let finalPath = legacyPath;

          // Si la carpeta de la proforma existe, migrar el archivo legacy hacia ella
          if (existsSync(folderPath)) {
            const targetPath = join(folderPath, legacyFile);
            if (!existsSync(targetPath)) {
              try {
                renameSync(legacyPath, targetPath);
                finalPath = targetPath;
              } catch {
                finalPath = legacyPath;
              }
            }
          }

          const lowerLegacy = legacyFile.toLowerCase();
          results.push({
            filename: legacyFile,
            extension: lowerLegacy.endsWith('.pdf') ? ('pdf' as const) : ('xlsx' as const),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            absolutePath: finalPath,
            version: extractVersionFromFilename(legacyFile),
            isLatest: false,
          });
          visitedFilenames.add(legacyFile);
        } catch {
          // Skip
        }
      }
    }
  } catch {
    // Skip legacy errors
  }

  // 3. Determinar isLatest únicamente para el archivo más reciente de cada extensión
  const latestPdf = results
    .filter((r) => r.extension === 'pdf')
    .sort(
      (a, b) =>
        b.version - a.version ||
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    )[0];

  const latestExcel = results
    .filter((r) => r.extension === 'xlsx')
    .sort(
      (a, b) =>
        b.version - a.version ||
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    )[0];

  if (latestPdf) latestPdf.isLatest = true;
  if (latestExcel) latestExcel.isLatest = true;

  // 4. Ordenar: mayor versión primero; si tienen la misma versión, más reciente primero; PDF antes de Excel
  results.sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    const timeDiff =
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.extension === 'pdf' ? -1 : 1;
  });

  return results;
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
