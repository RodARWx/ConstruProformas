/**
 * Las notas de usuario se almacenan en una sola columna texto,
 * separadas por salto de línea. Cada línea se exporta con prefijo *.
 */
export function serializeProformaNotes(
  notes: string | string[] | undefined | null,
): string | null {
  if (notes === undefined || notes === null) {
    return null;
  }

  const lines = (Array.isArray(notes) ? notes : notes.split('\n'))
    .map((note) => note.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : null;
}

export function parseProformaNotes(notas: string | null | undefined): string[] {
  if (!notas?.trim()) {
    return [];
  }

  return notas
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildUserNotesForExport(notas: string | null | undefined): string[] {
  return parseProformaNotes(notas).map((line) => `*${line}`);
}
