/**
 * Seed MANUAL del catálogo desde Excel (.xls o .xlsx).
 *
 * Columnas esperadas: Código, Categoría, Nombre, Porcentaje IVA
 * - Código → codigoSugerido (ID del rubro)
 * - Categoría → entidad Category (nombre; descripcion NULL)
 * - Nombre → descripcion del rubro en catálogo
 * - IVA → ivaPercentage
 * - unidad y costoUnitario → estimados por heurística (editables en app)
 *
 * Ejecutar: npm run seed:catalog
 * Archivo por defecto: seed-data/productos.xls
 * Override: SEED_EXCEL_PATH=/ruta/al/archivo.xls
 */
import { existsSync, mkdirSync } from 'fs';
import { dirname, extname, join } from 'path';
import { DatabaseSync } from 'node:sqlite';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { estimateCatalogDefaults } from './catalog-estimation.helper';

const DEFAULT_EXCEL_PATH = join(process.cwd(), 'seed-data', 'productos.xls');
const EXCEL_PATH = process.env.SEED_EXCEL_PATH ?? DEFAULT_EXCEL_PATH;
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

function isHeaderRow(row: unknown[]): boolean {
  const colCodigo = normalizeHeader(row[0]);
  const colCategoria = normalizeHeader(row[1]);
  const colNombre = normalizeHeader(row[2]);
  const colIva = normalizeHeader(row[3]);

  return (
    colCodigo === 'codigo' &&
    colCategoria === 'categoria' &&
    colNombre === 'nombre' &&
    colIva.includes('iva')
  );
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let index = 0; index < Math.min(rows.length, 25); index += 1) {
    if (isHeaderRow(rows[index] ?? [])) {
      return index;
    }
  }

  throw new Error(
    'No se encontró la fila de encabezados esperada (Código, Categoría, Nombre, Porcentaje IVA)',
  );
}

function parseProductRows(rows: unknown[][], headerRowIndex: number): ExcelProductRow[] {
  const products: ExcelProductRow[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const codigoSugerido = String(row[0] ?? '').trim();
    const categoriaNombre = String(row[1] ?? '').trim();
    const descripcion = String(row[2] ?? '').trim();

    if (!codigoSugerido && !descripcion) {
      continue;
    }

    if (!codigoSugerido || !categoriaNombre || !descripcion) {
      throw new Error(
        `Fila ${rowIndex + 1} incompleta: código, categoría y nombre son obligatorios`,
      );
    }

    products.push({
      codigoSugerido,
      categoriaNombre,
      descripcion,
      ivaPercentage: parseIva(row[3]),
    });
  }

  if (products.length === 0) {
    throw new Error('No se encontraron filas de productos en el Excel');
  }

  return products;
}

async function readRowsFromXlsx(filePath: string): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const rows: unknown[][] = [];
  worksheet.eachRow((row) => {
    rows.push([
      row.getCell(1).value,
      row.getCell(2).value,
      row.getCell(3).value,
      row.getCell(4).value,
    ]);
  });
  return rows;
}

function readRowsFromXls(filePath: string): unknown[][] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  });
}

async function readProductsFromExcel(): Promise<ExcelProductRow[]> {
  if (!existsSync(EXCEL_PATH)) {
    throw new Error(`Archivo no encontrado: ${EXCEL_PATH}`);
  }

  const extension = extname(EXCEL_PATH).toLowerCase();
  const rows =
    extension === '.xls'
      ? readRowsFromXls(EXCEL_PATH)
      : await readRowsFromXlsx(EXCEL_PATH);

  const headerRowIndex = findHeaderRowIndex(rows);
  return parseProductRows(rows, headerRowIndex);
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

  const findCategory = db.prepare('SELECT nombre FROM categories WHERE nombre = ?');
  const insertCategory = db.prepare(
    'INSERT INTO categories (nombre, descripcion) VALUES (?, NULL)',
  );
  const findItemByCode = db.prepare('SELECT id FROM item_catalog WHERE codigoSugerido = ?');
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

  db.close();
}

runSeed().catch((error: unknown) => {
  console.error('Error en seed:catalog:', error);
  process.exit(1);
});
