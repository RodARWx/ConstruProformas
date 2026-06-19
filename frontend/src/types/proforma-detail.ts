/**
 * Desglose de Análisis de Precio Unitario (APU).
 * Solo calculadora auxiliar del cliente; el backend actual NO persiste estos campos.
 * TODO: confirmar con backend si existirá endpoint/modelo para APU antes de enviarlo.
 */
export interface ApuBreakdown {
  rendimiento: string
  equipos: string
  manoObra: string
  materiales: string
  herramientas: string
  transporte: string
  alimentacionEstadia: string
}

export function createEmptyApuBreakdown(): ApuBreakdown {
  return {
    rendimiento: '',
    equipos: '',
    manoObra: '',
    materiales: '',
    herramientas: '',
    transporte: '',
    alimentacionEstadia: '',
  }
}

export interface ProformaDetailLine {
  localId: string
  codigo: string
  descripcion: string
  /** Opcional; distinto de diasLaborables (tiempo de rubro legacy). */
  tiempo?: string
  unidad: string
  cantidad: number
  costoUnitario: number
  /** Días laborables del rubro en esta proforma; suman el tiempo de ejecución. */
  diasLaborables: number
  /** Porcentaje de IVA aplicado a esta línea (0–100). */
  ivaPercentage: number
  /** APU auxiliar local; no se envía al backend. */
  apu: ApuBreakdown
}

export function createDetailLine(
  partial: Partial<Omit<ProformaDetailLine, 'localId' | 'apu'>> & {
    localId?: string
  } = {},
): ProformaDetailLine {
  return {
    localId: partial.localId ?? crypto.randomUUID(),
    codigo: partial.codigo ?? '',
    descripcion: partial.descripcion ?? '',
    tiempo: partial.tiempo,
    unidad: partial.unidad ?? '',
    cantidad: partial.cantidad ?? 1,
    costoUnitario: partial.costoUnitario ?? 0,
    diasLaborables: partial.diasLaborables ?? 1,
    ivaPercentage: partial.ivaPercentage ?? 15,
    apu: createEmptyApuBreakdown(),
  }
}

/** Total de línea solo para referencia visual en edición; el backend recalcula al guardar. */
export function calculateLineTotalReference(
  cantidad: number,
  costoUnitario: number,
): number {
  return cantidad * costoUnitario
}
