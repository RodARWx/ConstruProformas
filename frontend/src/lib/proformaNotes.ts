/** Convierte líneas de nota ↔ texto almacenado en el servidor (separado por \\n). */
export function parseProformaNotes(notas: string | null | undefined): string[] {
  if (!notas?.trim()) {
    return ['']
  }

  const lines = notas
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.length > 0 ? lines : ['']
}

export function serializeProformaNotes(lines: string[]): string | undefined {
  const normalized = lines.map((line) => line.trim()).filter(Boolean)
  return normalized.length > 0 ? normalized.join('\n') : undefined
}
