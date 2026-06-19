/**
 * Seed MANUAL del catálogo desde `seed-data/productos.xlsx`.
 *
 * IMPORTANTE: este Excel es solo fuente de carga inicial. Tras ejecutar este script,
 * cualquier edición de unidad, costo, categoría o IVA se hace desde la aplicación
 * (base de datos vía API). No volver a leer el Excel en runtime ni en arranque.
 *
 * Ejecutar: npm run seed:catalog
 */
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { DatabaseSync } from 'node:sqlite';
import ExcelJS from 'exceljs';
import { estimateCatalogDefaults } from './catalog-estimation.helper';

const EXCEL_PATH = join(process.cwd(), 'seed-data', 'productos.xlsx');
const DATABASE_PATH =
  process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'construproformas.db');

interface ExcelProductRow {
  codigoSugerido: string;
  categoriaNombre: string;
  descripcion: string;
  ivaPercentage: number;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function parseIva(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Porcentaje IVA inválido: ${String(value)}`);
  }
  if (parsed < 0 || parsed > 100) {
    throw new Error(`Porcentaje IVA fuera de rango (0-100): ${parsed}`);
  }
  return parsed;
}

function findHeaderRow(worksheet: ExcelJS.Worksheet): number {
  for (let rowIndex = 1; rowIndex <= Math.min(worksheet.rowCount, 20); rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const colCodigo = normalizeHeader(row.getCell(1).value);
    const colCategoria = normalizeHeader(row.getCell(2).value);
    const colNombre = normalizeHeader(row.getCell(3).value);
    const colIva = normalizeHeader(row.getCell(4).value);

    if (
      colCodigo === 'codigo' &&
      colCategoria === 'categoria' &&
      colNombre === 'nombre' &&
      colIva.includes('iva')
    ) {
      return rowIndex;
    }
  }

  throw new Error(
    'No se encontró la fila de encabezados esperada (Código, Categoría, Nombre, Porcentaje IVA)',
  );
}

async function readProductsFromExcel(): Promise<ExcelProductRow[]> {
  if (!existsSync(EXCEL_PATH)) {
    throw new Error(`Archivo no encontrado: ${EXCEL_PATH}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const headerRow = findHeaderRow(worksheet);
  const products: ExcelProductRow[] = [];

  for (let rowIndex = headerRow + 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const codigoSugerido = String(row.getCell(1).value ?? '').trim();
    const categoriaNombre = String(row.getCell(2).value ?? '').trim();
    const descripcion = String(row.getCell(3).value ?? '').trim();

    if (!codigoSugerido && !descripcion) {
      continue;
    }

    if (!codigoSugerido || !categoriaNombre || !descripcion) {
      throw new Error(
        `Fila ${rowIndex} incompleta: código, categoría y nombre son obligatorios`,
      );
    }

    products.push({
      codigoSugerido,
      categoriaNombre,
      descripcion,
      ivaPercentage: parseIva(row.getCell(4).value),
    });
  }

  if (products.length === 0) {
    throw new Error('No se encontraron filas de productos en el Excel');
  }

  return products;
}

function tableHasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((item) => item.name === column);
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      nombre TEXT PRIMARY KEY NOT NULL,
      descripcion TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS item_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigoSugerido TEXT,
      descripcion TEXT NOT NULL,
      unidad TEXT NOT NULL,
      costoUnitario REAL NOT NULL DEFAULT 0,
      diasLaborables INTEGER NOT NULL DEFAULT 1,
      ivaPercentage REAL NOT NULL DEFAULT 15,
      categoriaNombre TEXT,
      FOREIGN KEY (categoriaNombre) REFERENCES categories(nombre) ON DELETE SET NULL ON UPDATE NO ACTION
    );
  `);

  if (!tableHasColumn(db, 'item_catalog', 'diasLaborables')) {
    db.exec(`ALTER TABLE item_catalog ADD COLUMN diasLaborables INTEGER NOT NULL DEFAULT 1`);
  }

  if (!tableHasColumn(db, 'item_catalog', 'ivaPercentage')) {
    db.exec(`ALTER TABLE item_catalog ADD COLUMN ivaPercentage REAL NOT NULL DEFAULT 15`);
  }

  if (!tableHasColumn(db, 'item_catalog', 'categoriaNombre')) {
    db.exec(`ALTER TABLE item_catalog ADD COLUMN categoriaNombre TEXT`);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_item_catalog_descripcion
    ON item_catalog(descripcion);
  `);
}

async function runSeed(): Promise<void> {
  const databaseDir = dirname(DATABASE_PATH);
  if (!existsSync(databaseDir)) {
    mkdirSync(databaseDir, { recursive: true });
  }

  const db = new DatabaseSync(DATABASE_PATH);
  ensureSchema(db);

  const products = await readProductsFromExcel();

  const findCategory = db.prepare(
    'SELECT nombre FROM categories WHERE nombre = ?',
  );
  const insertCategory = db.prepare(
    'INSERT INTO categories (nombre, descripcion) VALUES (?, NULL)',
  );
  const findItemByCode = db.prepare(
    'SELECT id FROM item_catalog WHERE codigoSugerido = ?',
  );
  const insertItem = db.prepare(`
    INSERT INTO item_catalog (
      codigoSugerido, descripcion, unidad, costoUnitario,
      diasLaborables, ivaPercentage, categoriaNombre
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let categoriesCreated = 0;
  let categoriesReused = 0;
  let itemsCreated = 0;
  let itemsSkipped = 0;

  db.exec('BEGIN');
  try {
    for (const product of products) {
      const existingCategory = findCategory.get(product.categoriaNombre) as
        | { nombre: string }
        | undefined;

      if (!existingCategory) {
        insertCategory.run(product.categoriaNombre);
        categoriesCreated += 1;
      } else {
        categoriesReused += 1;
      }

      const existingItem = findItemByCode.get(product.codigoSugerido) as
        | { id: number }
        | undefined;

      if (existingItem) {
        itemsSkipped += 1;
        continue;
      }

      const estimation = estimateCatalogDefaults(product.descripcion);
      insertItem.run(
        product.codigoSugerido,
        product.descripcion,
        estimation.unidad,
        estimation.costoUnitario,
        1,
        product.ivaPercentage,
        product.categoriaNombre,
      );
      itemsCreated += 1;
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  const totalCategories = (
    db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }
  ).count;
  const totalItems = (
    db.prepare('SELECT COUNT(*) AS count FROM item_catalog').get() as { count: number }
  ).count;

  console.log('--- Seed catálogo desde Excel (carga inicial) ---');
  console.log(`Archivo: ${EXCEL_PATH}`);
  console.log(`Base de datos: ${DATABASE_PATH}`);
  console.log(`Filas leídas del Excel: ${products.length}`);
  console.log(`Categorías creadas en esta ejecución: ${categoriesCreated}`);
  console.log(`Categorías reutilizadas en esta ejecución: ${categoriesReused}`);
  console.log(`Rubros insertados en esta ejecución: ${itemsCreated}`);
  console.log(`Rubros omitidos (codigoSugerido duplicado): ${itemsSkipped}`);
  console.log(`Total categorías en BD: ${totalCategories}`);
  console.log(`Total rubros en BD: ${totalItems}`);
  console.log('');
  console.log(
    'Nota: unidad y costoUnitario fueron estimados para arranque. Edítelos desde la app.',
  );

  db.close();
}

runSeed().catch((error: unknown) => {
  console.error('Error en seed:catalog:', error);
  process.exit(1);
});
