import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Profile } from '../../profiles/entities/profile.entity';

/** Resuelve la raíz del backend (dist o fuente en desarrollo). */
export function getBackendRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'assets'))) {
    return cwd;
  }
  if (existsSync(join(cwd, 'dist', 'assets'))) {
    return join(cwd, 'dist');
  }
  return cwd;
}

export function resolveAssetPath(relativePath: string): string {
  return join(getBackendRoot(), 'assets', relativePath);
}

export function resolveLogoPath(): string | null {
  if (process.env.PROFORMA_LOGO_PATH && existsSync(process.env.PROFORMA_LOGO_PATH)) {
    return process.env.PROFORMA_LOGO_PATH;
  }

  const defaultPath = resolveAssetPath('images/logo-construmetrica.png');
  return existsSync(defaultPath) ? defaultPath : null;
}

export function resolveFontPath(envVar: string, defaultRelative: string): string | null {
  const custom = process.env[envVar];
  if (custom && existsSync(custom)) {
    return custom;
  }

  const defaultPath = resolveAssetPath(defaultRelative);
  return existsSync(defaultPath) ? defaultPath : null;
}

export function readLogoBuffer(): Buffer | null {
  if (process.env.PROFORMA_LOGO_BASE64) {
    return Buffer.from(process.env.PROFORMA_LOGO_BASE64, 'base64');
  }

  const logoPath = resolveLogoPath();
  if (!logoPath) {
    return null;
  }

  return readFileSync(logoPath);
}

/** QR de WhatsApp según el perfil emisor (Mario / Francisco). */
export function resolveProfileQrPath(profile: Profile): string | null {
  if (profile.id === 1) {
    const path = resolveAssetPath('images/qr-mario-lincango.png');
    return existsSync(path) ? path : null;
  }

  if (profile.id === 2) {
    const path = resolveAssetPath('images/qr-francisco-lopez.png');
    return existsSync(path) ? path : null;
  }

  const normalized = profile.nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

  if (normalized.includes('mario') && normalized.includes('lincango')) {
    const path = resolveAssetPath('images/qr-mario-lincango.png');
    return existsSync(path) ? path : null;
  }

  if (
    normalized.includes('francisco') &&
    (normalized.includes('lopez') || normalized.includes('paul'))
  ) {
    const path = resolveAssetPath('images/qr-francisco-lopez.png');
    return existsSync(path) ? path : null;
  }

  return null;
}

export function readProfileQrBuffer(profile: Profile): Buffer | null {
  const qrPath = resolveProfileQrPath(profile);
  if (!qrPath) {
    return null;
  }

  return readFileSync(qrPath);
}
