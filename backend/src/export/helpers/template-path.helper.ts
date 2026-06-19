import { existsSync } from 'fs';
import { join } from 'path';

const TEMPLATE_FILENAME = 'plantilla-proforma.xlsx';

/** Resuelve la ruta de la plantilla institucional Excel. */
export function getProformaExcelTemplatePath(): string {
  const candidates = [
    join(process.cwd(), 'assets', 'templates', TEMPLATE_FILENAME),
    join(process.cwd(), 'dist', 'assets', 'templates', TEMPLATE_FILENAME),
    join(process.cwd(), 'backend', 'assets', 'templates', TEMPLATE_FILENAME),
    join(__dirname, '..', '..', '..', 'assets', 'templates', TEMPLATE_FILENAME),
    join(__dirname, '..', '..', 'templates', TEMPLATE_FILENAME),
  ];

  const resolved = candidates.find((path) => existsSync(path));

  if (!resolved) {
    throw new Error(
      `No se encontró la plantilla Excel en: ${candidates.join(', ')}`,
    );
  }

  return resolved;
}
