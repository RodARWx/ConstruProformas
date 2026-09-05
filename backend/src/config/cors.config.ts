import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Normaliza URL de origen (sin barra final). */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Orígenes CORS permitidos.
 * Vacío o `*` → refleja el origen de cada petición (Render/Railway).
 */
export function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') {
    return true;
  }
  const origins = raw.split(',').map(normalizeOrigin).filter(Boolean);
  if (origins.length === 0) {
    return true;
  }
  return origins.length === 1 ? origins[0] : origins;
}

/** Opciones CORS compartidas (Express + Nest). */
export function buildCorsOptions(): CorsOptions {
  const origin = resolveCorsOrigin();
  return {
    origin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 204,
  };
}

export function describeCorsOrigin(
  origin: boolean | string | string[],
): string {
  if (typeof origin === 'string') {
    return origin;
  }
  if (Array.isArray(origin)) {
    return origin.join(', ');
  }
  return 'cualquier origen (reflect)';
}
