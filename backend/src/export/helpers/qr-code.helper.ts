import QRCode from 'qrcode';

/** Genera un código QR como PNG buffer para incrustar en reportes. */
export async function generateQrCodeBuffer(
  validationUrl: string,
  size = 120,
): Promise<Buffer> {
  return QRCode.toBuffer(validationUrl, {
    type: 'png',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

/** Construye la URL de validación de una proforma. */
export function buildProformaValidationUrl(
  idProforma: string,
  baseUrl?: string,
): string {
  const base =
    baseUrl?.trim() ||
    process.env.PROFORMA_VALIDATION_BASE_URL?.trim() ||
    'https://construmetrica.com/validar';

  const normalizedBase = base.replace(/\/$/, '');
  return `${normalizedBase}/${encodeURIComponent(idProforma)}`;
}
