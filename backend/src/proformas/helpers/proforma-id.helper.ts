/**
 * Formato de ID de proforma: CM_PROF-{numero}-{año}
 * Ejemplo: CM_PROF-200-2026
 *
 * El número se obtiene siempre del contador atómico en base de datos (ProformaCounter).
 * Este helper solo provee utilidades de parseo y formato.
 */

/** Prefijo fijo del ID de proforma */
export const PROFORMA_ID_PREFIX = 'CM_PROF';

/**
 * Construye el ID de proforma con el formato oficial:
 * CM_PROF-{numero}-{año}
 */
export function buildProformaId(sequence: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `${PROFORMA_ID_PREFIX}-${sequence}-${y}`;
}

/**
 * Parsea un ID de proforma y extrae el número secuencial y el año.
 * Soporta ambos formatos históricos: CM_PROF-200-2026 y CM-PROF-200-2026
 * Retorna null si el ID no coincide con ningún formato conocido.
 */
export function parseProformaId(idProforma: string): {
  sequence: number;
  year: number | null;
} | null {
  // Nuevo formato: CM_PROF-200-2026
  const newMatch = idProforma.match(/^CM_PROF-(\d+)-(\d{4})$/);
  if (newMatch) {
    return { sequence: parseInt(newMatch[1], 10), year: parseInt(newMatch[2], 10) };
  }

  // Formato heredado: CM-PROF-200-2026 o CM-PROF-85
  const legacyFull = idProforma.match(/^CM-PROF-(\d+)-(\d{4})$/);
  if (legacyFull) {
    return { sequence: parseInt(legacyFull[1], 10), year: parseInt(legacyFull[2], 10) };
  }

  const legacySimple = idProforma.match(/^CM-PROF-(\d+)$/);
  if (legacySimple) {
    return { sequence: parseInt(legacySimple[1], 10), year: null };
  }

  // Formato genérico de emergencia: cualquier cosa que termine en -número
  const genericMatch = idProforma.match(/^(.*-)(\d+)$/);
  if (genericMatch) {
    return { sequence: parseInt(genericMatch[2], 10), year: null };
  }

  return null;
}

/**
 * Dado un listado de IDs existentes (para arranque inicial o fallback),
 * determina el número secuencial máximo en el año actual.
 * Usado solo como referencia inicial al bootstrap del contador.
 */
export function findMaxSequenceForYear(existingIds: string[], year: number): number {
  let max = 0;
  for (const id of existingIds) {
    const parsed = parseProformaId(id);
    if (parsed && (parsed.year === year || parsed.year === null) && parsed.sequence > max) {
      max = parsed.sequence;
    }
  }
  return max;
}
