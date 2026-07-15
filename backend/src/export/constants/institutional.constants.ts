/** Datos fijos de cabecera institucional */
export const INSTITUTIONAL_COMPANY = {
  nombre: 'CONSTRUMÉTRICA CIA. LTDA.',
  razonSocial: 'CONSTRUMÉTRICA INGENIEROS METRICAASOCIADOS CIA. LTDA.',
  ruc: '1793134424001',
  direccion: 'Urb. El Condado, Calle Gonzalo N° 73-232, LT370',
} as const;

/**
 * Notas institucionales del pie (cada una en merge A:G).
 * El texto completo va en una sola celda; no repetir en columnas.
 */
export const INSTITUTIONAL_NOTES: readonly string[] = [
  '*El costo incluye IVA.',
  '*El contratante entregará toda la información, planos, accesos y permisos necesarios para la ejecución del servicio contratado.',
  '*La validez de la propuesta es 60 días.',
  '*Tipo de Garantía: Garantía de calidad del informe técnico entregado conforme a normativa vigente y especificaciones acordadas.',
  '*Tiempo de garantía: 90 días calendario contados desde la entrega del informe técnico.',
];

/** Etiquetas de metadatos del cliente en la proforma */
export const CLIENT_META_LABELS = {
  cliente: 'CLIENTE',
  ruc: 'RUC',
  montoContrato: 'MONTO CONTRATO',
  tiempoEjecucion: 'TIEMPO EJECUCIÓN',
  fecha: 'FECHA',
} as const;

/** Encabezados de la tabla de rubros (filas 12-13) */
export const TABLE_HEADERS = {
  row1: {
    codigo: 'CÓDIGO',
    descripcion: 'DESCRIPCIÓN',
    tiempo: 'TIEMPO / DÍAS LABORABLES',
    unidad: 'UNIDAD',
    contratado: 'CONTRATADO',
  },
  row2: {
    cantidad: 'CANTIDAD',
    costoUnitario: 'C. UNIT.',
    total: 'TOTAL',
  },
} as const;

export const TOTALS_LABELS = {
  totalDias: 'TOTAL EN DÍAS',
  subtotal: 'SUBTOTAL',
  iva: 'IVA',
  total: 'TOTAL',
} as const;
