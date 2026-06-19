import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const LOGO_FILENAME = 'logo-construmetrica.png';

export interface LogoSourceOptions {
  filePath?: string;
  buffer?: Buffer;
}

function defaultLogoCandidates(): string[] {
  return [
    join(process.cwd(), 'assets', 'images', LOGO_FILENAME),
    join(process.cwd(), 'backend', 'assets', 'images', LOGO_FILENAME),
    join(__dirname, '..', '..', '..', 'assets', 'images', LOGO_FILENAME),
  ];
}

export function getLogoPath(explicitPath?: string): string | null {
  if (explicitPath?.trim() && existsSync(explicitPath.trim())) {
    return explicitPath.trim();
  }

  const envPath = process.env.PROFORMA_LOGO_PATH?.trim();
  if (envPath) {
    const candidates = [
      envPath,
      join(process.cwd(), envPath),
      join(process.cwd(), 'assets', 'images', envPath),
    ];
    const resolved = candidates.find((path) => existsSync(path));
    if (resolved) {
      return resolved;
    }
  }

  return defaultLogoCandidates().find((path) => existsSync(path)) ?? null;
}

export function readLogoFromBase64Env(): Buffer | null {
  const encoded = process.env.PROFORMA_LOGO_BASE64?.trim();
  if (!encoded) {
    return null;
  }

  const normalized = encoded.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(normalized, 'base64');
}

/** Logo para incrustar: buffer explícito > base64 env > ruta env > asset por defecto */
export function readLogoBuffer(options: LogoSourceOptions = {}): Buffer | null {
  if (options.buffer?.length) {
    return options.buffer;
  }

  const fromBase64 = readLogoFromBase64Env();
  if (fromBase64?.length) {
    return fromBase64;
  }

  const path = getLogoPath(options.filePath);
  if (!path) {
    return null;
  }

  return readFileSync(path);
}
