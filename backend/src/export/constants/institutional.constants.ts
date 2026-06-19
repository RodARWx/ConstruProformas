/** Datos institucionales fijos de Construmétrica */
export const INSTITUTIONAL = {
  companyName: 'CONSTRUMÉTRICA CIA. LTDA.',
  ruc: '1793134424001',
  address: 'Urb. El Condado, Calle Gonzalo N° 73-232, LT370',
  addressLabel: 'DIRECCIÓN:',
  rucLabel: 'RUC:',
} as const;

/** Notas legales predeterminadas del pie de página */
export const INSTITUTIONAL_NOTES: readonly string[] = [
  'El costo incluye IVA',
  'El contratante entregará toda la información correspondiente al trabajo a realizar y definirá el alcance antes de iniciar los trabajos.',
  'La validez de la propuesta es 60 días.',
  'Tipo de Garantía: Garantía de calidad del informe técnico, que cubre correcciones, aclaraciones y ajustes derivados del análisis geotécnico presentado.',
  'Tiempo de garantía: 90 días calendario contados a partir de la entrega formal del informe técnico.',
] as const;

/** Etiquetas de metadatos del cliente en la plantilla */
export const CLIENT_FIELD_LABELS = {
  project: 'PROYECTO:',
  client: 'CLIENTE:',
  ruc: 'RUC/CÉDULA:',
  contractAmount: 'MONTO DEL CONTRATO:',
  executionTime: 'TIEMPO EJECUCIÓN :',
  date: 'FECHA:',
} as const;

/** Posiciones de imágenes en la plantilla v2 (columnas/filas Excel, ext en px) */
export const REPORT_IMAGE_ANCHORS = {
  /** Logo personalizado inyectado en esquina superior izquierda */
  customLogo: { col: 0.05, row: 0.05, width: 140, height: 44 },
  /** QR dinámico sobre la zona del pie (7 filas antes del bloque contacto) */
  qrOffsetFromContact: 7,
  qr: { col: 4.45, width: 90, height: 90 },
} as const;
