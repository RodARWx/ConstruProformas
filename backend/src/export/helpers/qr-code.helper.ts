import QRCode from 'qrcode';
import { Profile } from '../../profiles/entities/profile.entity';
import { readProfileQrBuffer } from './asset-path.helper';

/**
 * Obtiene el buffer PNG del QR de contacto del perfil emisor.
 * Usa las imágenes institucionales de WhatsApp; si no hay coincidencia, genera QR de validación.
 */
export async function resolveExportQrBuffer(
  profile: Profile,
  idProforma: string,
): Promise<Buffer> {
  const profileQr = readProfileQrBuffer(profile);
  if (profileQr) {
    return profileQr;
  }

  return generateValidationQrBuffer(idProforma);
}

/**
 * Genera el buffer PNG del código QR de validación de la proforma (fallback).
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
