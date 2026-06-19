import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
