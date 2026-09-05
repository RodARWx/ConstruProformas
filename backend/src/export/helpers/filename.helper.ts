/** Caracteres prohibidos en nombres de archivo Windows/Linux */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Construye el nombre de archivo de exportación:
 * "[ID de la Proforma] - [Nombre del Proyecto].ext"
 * eliminando caracteres inválidos para sistemas de archivos.
 */
export function buildExportFilename(
  idProforma: string,
  nombreProyecto: string,
  extension: 'xlsx' | 'pdf',
): string {
  const rawBase = `${idProforma} - ${nombreProyecto}`;

  const sanitized = rawBase
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim()
    .slice(0, 180);

  const safeBase = sanitized.length > 0 ? sanitized : idProforma;

  return `${safeBase}.${extension}`;
}

/** Formatea montos monetarios con 2 decimales y símbolo $ para reportes */
export function formatCurrency(value: number): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `$${num.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formatea fecha ISO a presentación legible */
export function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
