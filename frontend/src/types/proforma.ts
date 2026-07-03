import type { ProformaDetailLine } from './proforma-detail'

export type ProformaStatus = 'DRAFT' | 'EXPORTED'

export interface NextIdResponse {
  suggestedId: string
}

export interface ProformaDetail {
  id: number
  codigo: string | null
  descripcion: string
  tiempo: string | null
  unidad: string
  cantidad: number
  costoUnitario: number
  total: number
  diasLaborables: number
  ivaPercentage: number
}

export interface Proforma {
  idProforma: string
  nombreProyecto: string
  tiempoEjecucion: string | null
  fecha: string
  notas: string | null
  subtotal: number
  iva: number
  totalGeneral: number
  montoContrato: number
  status: ProformaStatus
  profileId: number
  customerId: number
  clienteNombre?: string | null
  clienteRucCedula?: string | null
  clienteDireccion?: string | null
  clienteTelefono?: string | null
  clienteCorreo?: string | null
  detalles?: ProformaDetail[]
  profile?: {
    id: number
    nombre: string
    cargo: string
    registroSenescyt: string | null
    telefono: string | null
    correo: string | null
  }
  customer?: {
    id: number
    nombreCliente: string
    rucCedula: string
    direccion: string | null
    telefono: string | null
    correo: string | null
  }
  deletedAt?: string | null
}

/** Cabecera de proforma en borrador local. */
export interface ProformaHeaderDraft {
  idProforma: string
  suggestedId: string
  nombreProyecto: string
  customerId: number | ''
  nombreCliente: string
  rucCedula: string
  direccion: string
  telefonoCliente: string
  fecha: string
  profileId: number | ''
  /** Líneas de notas adicionales (cada una se exporta con viñeta). */
  notasLines: string[]
}

export interface ProformaDraft {
  header: ProformaHeaderDraft
  detalles: ProformaDetailLine[]
}

export interface ExportedFileInfo {
  filename: string
  absolutePath: string
  relativePath: string
  mimeType: string
}

export interface ProformaExportResult {
  idProforma: string
  nombreProyecto: string
  exportDirectory: string
  excel?: ExportedFileInfo
  pdf?: ExportedFileInfo
  status: ProformaStatus
}

export type ProformaIdAvailability = 'available' | 'in_use' | 'exported'

export function createEmptyHeaderDraft(
  suggestedId = '',
  fecha = new Date().toISOString().slice(0, 10),
): ProformaHeaderDraft {
  return {
    idProforma: suggestedId,
    suggestedId,
    nombreProyecto: '',
    customerId: '',
    nombreCliente: '',
    rucCedula: '',
    direccion: '',
    telefonoCliente: '',
    fecha,
    profileId: '',
    notasLines: [''],
  }
}
