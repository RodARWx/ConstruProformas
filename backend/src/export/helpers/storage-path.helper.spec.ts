import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  deleteProformaStorageFolders,
  findExistingProformaFolders,
  getProformasStorageRoot,
  isProformaFile,
} from './storage-path.helper';

describe('storage-path.helper', () => {
  const testId = 'CM-PROF-999-2026';
  const root = getProformasStorageRoot();
  const yearFolder = join(root, 'PROFORMAS 2026');
  const proformaFolder = join(yearFolder, `${testId} Proyecto de Prueba`);

  beforeEach(() => {
    if (!existsSync(yearFolder)) {
      mkdirSync(yearFolder, { recursive: true });
    }
    if (!existsSync(proformaFolder)) {
      mkdirSync(proformaFolder, { recursive: true });
    }
    writeFileSync(join(proformaFolder, `${testId} - Proyecto.xlsx`), 'test-xlsx');
    writeFileSync(join(proformaFolder, `${testId} - Proyecto.pdf`), 'test-pdf');
  });

  afterEach(() => {
    deleteProformaStorageFolders(testId);
  });

  it('debe encontrar la carpeta de la proforma creada', () => {
    const folders = findExistingProformaFolders(testId);
    expect(folders.length).toBeGreaterThanOrEqual(1);
    expect(folders).toContain(proformaFolder);
  });

  it('debe eliminar físicamente la carpeta y archivos al llamar deleteProformaStorageFolders', () => {
    expect(existsSync(proformaFolder)).toBe(true);

    const deleted = deleteProformaStorageFolders(testId);
    expect(deleted).toContain(proformaFolder);
    expect(existsSync(proformaFolder)).toBe(false);

    // Búsqueda posterior debe ser vacía
    const remaining = findExistingProformaFolders(testId);
    expect(remaining).toHaveLength(0);
  });

  it('debe validar estrictamente archivos de la proforma con isProformaFile', () => {
    expect(isProformaFile(`${testId} - Presupuesto.xlsx`, testId)).toBe(true);
    expect(isProformaFile(`${testId} - Presupuesto_V2.pdf`, testId)).toBe(true);
    expect(isProformaFile('Prueba.xlsx', testId)).toBe(false);
    expect(isProformaFile('Documento.docx', testId)).toBe(false);
  });
});
