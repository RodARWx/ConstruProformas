import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** Nombres PostScript que Excel y LibreOffice deben resolver */
export const BRAND_FONT_FAMILY = {
  black: 'Gotham Black',
  book: 'Gotham Book',
} as const;

const FONT_FILE_CANDIDATES = {
  black: [
    'Gotham-Black.otf',
    'GothamBlack.otf',
    'Gotham Black.otf',
    'Gotham-Black.ttf',
    'GothamBlack.ttf',
  ],
  book: [
    'Gotham-Book.otf',
    'GothamBook.otf',
    'Gotham Book.otf',
    'Gotham-Book.ttf',
    'GothamBook.ttf',
  ],
} as const;

function fontDirectoryCandidates(): string[] {
  return [
    join(process.cwd(), 'assets', 'fonts'),
    join(process.cwd(), 'backend', 'assets', 'fonts'),
    join(__dirname, '..', '..', '..', 'assets', 'fonts'),
  ];
}

function resolveFromDirectory(
  dir: string,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const fullPath = join(dir, name);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/** Ruta absoluta a un archivo de fuente corporativa (o null si no está en assets). */
export function resolveBrandFontPath(variant: keyof typeof FONT_FILE_CANDIDATES): string | null {
  const envKey =
    variant === 'black'
      ? 'PROFORMA_FONT_GOTHAM_BLACK_PATH'
      : 'PROFORMA_FONT_GOTHAM_BOOK_PATH';
  const envPath = process.env[envKey]?.trim();
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  for (const dir of fontDirectoryCandidates()) {
    const resolved = resolveFromDirectory(dir, FONT_FILE_CANDIDATES[variant]);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export function areBrandFontsAvailable(): boolean {
  return (
    resolveBrandFontPath('black') !== null &&
    resolveBrandFontPath('book') !== null
  );
}

function mimeTypeForFont(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.woff2')) return 'font/woff2';
  if (lower.endsWith('.woff')) return 'font/woff';
  if (lower.endsWith('.otf')) return 'font/otf';
  return 'font/ttf';
}

function fontFormatForMime(mime: string): string {
  if (mime === 'font/woff2') return 'woff2';
  if (mime === 'font/woff') return 'woff';
  if (mime === 'font/otf') return 'opentype';
  return 'truetype';
}

function buildFontFaceRule(
  family: string,
  filePath: string,
  weight: 'normal' | 'bold',
): string {
  const mime = mimeTypeForFont(filePath);
  const format = fontFormatForMime(mime);
  const base64 = readFileSync(filePath).toString('base64');

  return `@font-face {
  font-family: '${family}';
  src: url('data:${mime};base64,${base64}') format('${format}');
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
}`;
}

/**
 * CSS @font-face con fuentes embebidas en base64.
 * Garantiza Gotham en PDF HTML (Puppeteer) sin depender del SO del cliente.
 */
export function buildBrandFontFaceCss(): string {
  const blackPath = resolveBrandFontPath('black');
  const bookPath = resolveBrandFontPath('book');

  if (!blackPath && !bookPath) {
    return `/* Gotham: agregue Gotham-Black.otf y Gotham-Book.otf en backend/assets/fonts/ */`;
  }

  const rules: string[] = [];

  if (blackPath) {
    rules.push(
      buildFontFaceRule(BRAND_FONT_FAMILY.black, blackPath, 'normal'),
    );
  }

  if (bookPath) {
    rules.push(buildFontFaceRule(BRAND_FONT_FAMILY.book, bookPath, 'normal'));
    rules.push(buildFontFaceRule(BRAND_FONT_FAMILY.book, bookPath, 'bold'));
  }

  return rules.join('\n\n');
}
