/**
 * Estructura de entrada para alimentar la exportación de proformas.
 * Corresponde al payload de POST /api/proformas con relaciones embebidas.
 */
export interface ProformaExportDetailInput {
  /** true = fila de categoría (A:G combinadas, centrada, no suma al total) */
  esCategoria?: boolean;
  codigo?: string;
  descripcion: string;
  tiempo?: string;
  unidad?: string;
  cantidad?: number;
  costoUnitario?: number;
}

export interface ProformaExportProfileInput {
  nombre: string;
  cargo: string;
  registroSenescyt?: string;
  telefono?: string;
  correo?: string;
}

export interface ProformaExportCustomerInput {
  nombreCliente: string;
  rucCedula: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
}

export interface ProformaExportPayload {
  idProforma: string;
  nombreProyecto: string;
  fecha: string;
  tiempoEjecucion?: string;
  appliesIva?: boolean;
  /** Si se omite, se usan las NOTAS institucionales predeterminadas */
  notas?: string | null;
  profile: ProformaExportProfileInput;
  customer: ProformaExportCustomerInput;
  detalles: ProformaExportDetailInput[];
}
