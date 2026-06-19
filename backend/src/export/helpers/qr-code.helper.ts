import QRCode from 'qrcode';

/**
 * Genera el buffer PNG del código QR de validación de la proforma.
 */
export async function generateValidationQrBuffer(idProforma: string): Promise<Buffer> {
  const baseUrl =
    process.env.PROFORMA_VALIDATION_BASE_URL ??
    'https://construmetrica.com/validar-proforma';

  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(idProforma)}`;

  return QRCode.toBuffer(url, {
    type: 'png',
    width: 120,
    margin: 1,
    color: {
      dark: '#550012',
      light: '#FFFFFF',
    },
  });
}

export function getValidationUrl(idProforma: string): string {
  const baseUrl =
    process.env.PROFORMA_VALIDATION_BASE_URL ??
    'https://construmetrica.com/validar-proforma';

  return `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(idProforma)}`;
}
