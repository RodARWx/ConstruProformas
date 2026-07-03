import type { ProformaDetailLine } from '../../types/proforma-detail'
import type { ProformaHeaderDraft } from '../../types/proforma'
import { serializeProformaNotes } from '../../lib/proformaNotes'

/** Línea de detalle según CreateProformaDetailDto / UpdateProformaDetailDto del backend. */
export interface ProformaDetailPayload {
  codigo?: string
  descripcion: string
  tiempo?: string
  unidad: string
  cantidad: number
  costoUnitario: number
  diasLaborables: number
  ivaPercentage: number
}

/** Payload según CreateProformaDto del backend (V2). Sin campos calculados en servidor. */
export interface CreateProformaPayload {
  idProforma: string
  nombreProyecto: string
  fecha: string
  profileId: number
  customerId: number
  detalles: ProformaDetailPayload[]
  notas?: string
}

/** Payload según UpdateProformaDto del backend. */
export type UpdateProformaPayload = Omit<CreateProformaPayload, 'idProforma'>

function mapDetailLine(line: ProformaDetailLine): ProformaDetailPayload {
  return {
    codigo: line.codigo.trim() || undefined,
    descripcion: line.descripcion.trim(),
    tiempo: line.tiempo?.trim() || undefined,
    unidad: line.unidad.trim(),
    cantidad: line.cantidad,
    costoUnitario: line.costoUnitario,
    diasLaborables: line.diasLaborables,
    ivaPercentage: line.ivaPercentage,
  }
}

export function draftToCreatePayload(
  header: ProformaHeaderDraft,
  detalles: ProformaDetailLine[],
): CreateProformaPayload {
  const notas = serializeProformaNotes(header.notasLines)

  return {
    idProforma: header.idProforma.trim(),
    nombreProyecto: header.nombreProyecto.trim(),
    fecha: header.fecha,
    profileId: Number(header.profileId),
    customerId: Number(header.customerId),
    detalles: detalles.map(mapDetailLine),
    ...(notas ? { notas } : {}),
  }
}

export function draftToUpdatePayload(
  header: ProformaHeaderDraft,
  detalles: ProformaDetailLine[],
): UpdateProformaPayload {
  const {
    nombreProyecto,
    fecha,
    profileId,
    customerId,
    detalles: lineas,
    notas,
  } = draftToCreatePayload(header, detalles)
  return {
    nombreProyecto,
    fecha,
    profileId,
    customerId,
    detalles: lineas,
    ...(notas ? { notas } : {}),
  }
}
