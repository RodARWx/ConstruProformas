import { readFileSync } from 'fs';
import { resolveFontPath } from './asset-path.helper';

const fontCache = new Map<string, string>();

function loadFontBase64(envVar: string, relativePath: string): string | null {
  const cacheKey = `${envVar}:${relativePath}`;
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey) ?? null;
  }

  const fontPath = resolveFontPath(envVar, relativePath);
  if (!fontPath) {
    fontCache.set(cacheKey, '');
    return null;
  }

  const base64 = readFileSync(fontPath).toString('base64');
  fontCache.set(cacheKey, base64);
  return base64;
}

export function getGothamBlackBase64(): string | null {
  const value = loadFontBase64(
    'PROFORMA_FONT_GOTHAM_BLACK_PATH',
    'fonts/Gotham-Black.otf',
  );
  return value || null;
}

export function getGothamBookBase64(): string | null {
  const value = loadFontBase64(
    'PROFORMA_FONT_GOTHAM_BOOK_PATH',
    'fonts/Gotham-Book.otf',
  );
  return value || null;
}

/** CSS @font-face embebido para plantilla HTML / Puppeteer */
export function buildEmbeddedFontCss(): string {
  const black = getGothamBlackBase64();
  const book = getGothamBookBase64();

  const blocks: string[] = [];

  if (black) {
    blocks.push(`
@font-face {
  font-family: 'Gotham Black';
  src: url(data:font/opentype;base64,${black}) format('opentype');
  font-weight: 900;
  font-style: normal;
}`);
  }

  if (book) {
    blocks.push(`
@font-face {
  font-family: 'Gotham Book';
  src: url(data:font/opentype;base64,${book}) format('opentype');
  font-weight: 400;
  font-style: normal;
}`);
  }

  return blocks.join('\n');
}
