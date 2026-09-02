import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Profile } from '../../profiles/entities/profile.entity';

/**
 * Resuelve la raíz del backend (dist o fuente en desarrollo).
 * Soporta la ejecución con `cd backend` (`npm run start:dev`),
 * desde la raíz del workspace o en entornos compilados (`dist`).
 */
export function getBackendRoot(): string {
  const cwd = process.cwd();

  // 1. Ejecución estándar con `cd backend` (process.cwd() es .../backend)
  if (existsSync(join(cwd, 'assets'))) {
    return cwd;
  }

  // 2. Ejecución desde la raíz del workspace (process.cwd() es .../ConstruProformas)
  if (existsSync(join(cwd, 'backend', 'assets'))) {
    return join(cwd, 'backend');
  }

  // 3. Resolución basada en la ubicación física de este archivo (__dirname)
  const dirBasedRootSrc = join(__dirname, '..', '..', '..');
  if (existsSync(join(dirBasedRootSrc, 'assets'))) {
    return dirBasedRootSrc;
  }

  const dirBasedRootDist = join(__dirname, '..', '..');
  if (existsSync(join(dirBasedRootDist, 'assets'))) {
    return dirBasedRootDist;
  }

  // 4. Directorio dist dentro de cwd
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

  // 1. Intenta con logo-construmetrica.png
  const primaryPath = resolveAssetPath('images/logo-construmetrica.png');
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  // 2. Intenta con imagotipo-positivo-gris.png como alternativa
  const imagotipoPath = resolveAssetPath('images/imagotipo-positivo-gris.png');
  if (existsSync(imagotipoPath)) {
    return imagotipoPath;
  }

  return null;
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

export function resolveProformaExcelTemplatePath(): string | null {
  const custom = process.env.PROFORMA_EXCEL_TEMPLATE_PATH;
  if (custom && existsSync(custom)) {
    return custom;
  }

  const root = getBackendRoot();
  const candidates = [
    join(root, '..', 'Plantilla generación de proformas.xlsx'),
    join(process.cwd(), 'Plantilla generación de proformas.xlsx'),
    join(root, 'templates', 'plantilla-proforma.xlsx'),
    join(process.cwd(), 'templates', 'plantilla-proforma.xlsx'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
