const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const CORRECTIONS = [
  {
    code: 'A003',
    oldDesc: 'ALQUILER DE NIVEL AUTOMÀTICO',
    newDesc: 'ALQUILER DE NIVEL AUTOMÁTICO',
  },
  {
    code: 'A004',
    oldDesc: 'ALQUILER DE DRONE FOTOGRAMÈTRICO',
    newDesc: 'ALQUILER DE DRONE FOTOGRAMÉTRICO',
  },
  {
    code: 'C001',
    oldDesc: 'COLOCACIÒN DE PUNTOS DE CONTROL GEODESICO',
    newDesc: 'COLOCACIÓN DE PUNTOS DE CONTROL GEODÉSICO',
  },
  {
    code: 'C011',
    oldDesc: 'CREACION DE OBJETOS SIG',
    newDesc: 'CREACIÓN DE OBJETOS SIG',
  },
  {
    code: 'CA001',
    oldDesc: 'CÀLCULO ESTRUCTURAL POR M2',
    newDesc: 'CÁLCULO ESTRUCTURAL POR M2',
    newCat: 'CÁLCULO',
  },
  {
    code: 'CA002',
    oldDesc: 'MEDICION DE AREAS',
    newDesc: 'MEDICIÓN DE ÁREAS',
    newCat: 'CÁLCULO',
  },
  {
    code: 'CO010',
    oldDesc: 'CATASTRO DE SISTEMA DE DESAGUE',
    newDesc: 'CATASTRO DE SISTEMA DE DESAGÜE',
  },
  {
    code: 'COO6',
    oldDesc: 'CALCULO DE VOLUMENES DE TIERRA',
    newDesc: 'CÁLCULO DE VOLÚMENES DE TIERRA',
  },
  {
    code: 'D001',
    oldDesc: 'DISEÑO HIDRAÙLICO SANITARIO',
    newDesc: 'DISEÑO HIDRÁULICO SANITARIO',
  },
  {
    code: 'E002',
    oldDesc: 'ELABORACIOÒN DE PLANOS ARCGIS',
    newDesc: 'ELABORACIÓN DE PLANOS ARCGIS',
  },
  {
    code: 'E003',
    oldDesc: 'ELABORACIÒN DE MONOGRAFÌAS DE PUNTOS DE CONTROL GEODÈSICO',
    newDesc: 'ELABORACIÓN DE MONOGRAFÍAS DE PUNTOS DE CONTROL GEODÉSICO',
  },
  {
    code: 'E004',
    oldDesc: 'CONSULTORIA DE ESTUDIOS',
    newDesc: 'CONSULTORÍA DE ESTUDIOS',
  },
  {
    code: 'E007',
    oldDesc: 'CONSULTORIA DE ESTUDIOS DE TOPOGRAFIA',
    newDesc: 'CONSULTORÍA DE ESTUDIOS DE TOPOGRAFÍA',
  },
  {
    code: 'E008',
    oldDesc: 'TOPOGRAFIA',
    newDesc: 'TOPOGRAFÍA',
  },
  {
    code: 'E009',
    oldDesc: 'PLANOS DE CONTEO DE ARBOLES',
    newDesc: 'PLANOS DE CONTEO DE ÁRBOLES',
  },
  {
    code: 'E011',
    oldDesc: 'ASBUILD DE ALCANTARILLADO Y AGUA POTABLE',
    newDesc: 'AS-BUILT DE ALCANTARILLADO Y AGUA POTABLE',
  },
  {
    code: 'E012',
    oldDesc: 'ASBUILD ÉLECTRICO',
    newDesc: 'AS-BUILT ELÉCTRICO',
  },
  {
    code: 'E016',
    oldDesc: 'ESTUDIO DE MECANICA DE SUELOS',
    newDesc: 'ESTUDIO DE MECÁNICA DE SUELOS',
  },
  {
    code: 'E017',
    oldDesc: 'GEOTÉCNIA',
    newDesc: 'GEOTECNIA',
  },
  {
    code: 'E019',
    oldDesc: 'INFORME GEOTECNIA',
    newDesc: 'INFORME DE GEOTECNIA',
  },
  {
    code: 'E020',
    oldDesc: 'CÁLCULO DE VOLUMENES',
    newDesc: 'CÁLCULO DE VOLÚMENES',
  },
  {
    code: 'E021',
    oldDesc: 'EVALUACIÓN DEL SISTEMA DE ALCANTARRILLADO',
    newDesc: 'EVALUACIÓN DEL SISTEMA DE ALCANTARILLADO',
  },
  {
    code: 'E022',
    oldDesc: 'ELABORACION DE ORTOFOTO',
    newDesc: 'ELABORACIÓN DE ORTOFOTO',
  },
  {
    code: 'E030',
    oldDesc: 'LÍNEA SISMICA',
    newDesc: 'LÍNEA SÍSMICA',
  },
  {
    code: 'E034',
    oldDesc: 'PESO ESPECIFÍCO DEL SUELO',
    newDesc: 'PESO ESPECÍFICO DEL SUELO',
  },
  {
    code: 'L001',
    oldDesc: 'LEVANTAMIENTO PLANIMÈTRICO X M2',
    newDesc: 'LEVANTAMIENTO PLANIMÉTRICO X M2',
  },
  {
    code: 'L004',
    oldDesc: 'LEVANTAMIENTO AEROFOTOGRAMÈTRICO CON DRONE',
    newDesc: 'LEVANTAMIENTO AEROFOTOGRAMÉTRICO CON DRONE',
  },
  {
    code: 'l012',
    newCode: 'L012',
    oldDesc: 'VUELO CON DRON',
    newDesc: 'VUELO CON DRON',
  },
  {
    code: 'R001',
    oldDesc: 'RECORRIDO DE LINDERO CON ESTACIÒN TOTAL',
    newDesc: 'RECORRIDO DE LINDERO CON ESTACIÓN TOTAL',
  },
  {
    code: 'R003',
    oldDesc: 'VIATICOS Y SUBSISTENCIAS',
    newDesc: 'VIÁTICOS Y SUBSISTENCIAS',
  },
  {
    code: 'RP005',
    oldDesc: 'REPLANTEO TOPOGRAFICO(PLANIMETRIA)',
    newDesc: 'REPLANTEO TOPOGRÁFICO (PLANIMETRÍA)',
  },
  {
    code: 'T001',
    oldDesc: 'TRÀMITE DE REGULACIÒN DE ÀREAS',
    newDesc: 'TRÁMITE DE REGULACIÓN DE ÁREAS',
  },
  {
    code: 'T002',
    oldDesc: 'TRÀMITE DE UBICACIÒN GEOGRÀFICA DE LOTE',
    newDesc: 'TRÁMITE DE UBICACIÓN GEOGRÁFICA DE LOTE',
  },
  {
    code: 'T005',
    oldDesc: 'TRAMITE DE APROBACIÓN',
    newDesc: 'TRÁMITE DE APROBACIÓN',
  },
  {
    code: 'V001',
    oldDesc: 'VISITA TÈCNICA Y RECONOCIMIENTO',
    newDesc: 'VISITA TÉCNICA Y RECONOCIMIENTO',
  },
  {
    code: 'V002',
    oldDesc: 'MOVILIZACION DE EQUIPOS',
    newDesc: 'MOVILIZACIÓN DE EQUIPOS',
  },
];

async function updateExcelFiles() {
  console.log('=== Actualizando seed-data/productos.xlsx ===');
  const xlsxPath = path.resolve(__dirname, '../seed-data/productos.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];

  let modifiedRows = 0;
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const codeCell = row.getCell(1);
    const catCell = row.getCell(2);
    const descCell = row.getCell(3);

    const code = String(codeCell.value ?? '').trim();
    const cat = String(catCell.value ?? '').trim();
    const desc = String(descCell.value ?? '').trim();

    if (cat === 'CÀLCULO') {
      catCell.value = 'CÁLCULO';
      modifiedRows++;
    }

    const corr = CORRECTIONS.find(c => c.code.toLowerCase() === code.toLowerCase());
    if (corr) {
      if (corr.newCode && code !== corr.newCode) {
        codeCell.value = corr.newCode;
      }
      if (corr.newCat && cat !== corr.newCat) {
        catCell.value = corr.newCat;
      }
      if (desc !== corr.newDesc) {
        descCell.value = corr.newDesc;
        modifiedRows++;
      }
    }
  });

  await wb.xlsx.writeFile(xlsxPath);
  console.log(`productos.xlsx actualizado con éxito (${modifiedRows} cambios aplicados).`);

  // Now update seed-data/productos.xls
  console.log('=== Sincronizando seed-data/productos.xls ===');
  const xlsPath = path.resolve(__dirname, '../seed-data/productos.xls');
  // Read back the clean xlsx and write to xls
  const cleanWb = XLSX.readFile(xlsxPath);
  XLSX.writeFile(cleanWb, xlsPath, { bookType: 'biff8' });
  console.log('productos.xls sincronizado con éxito.');
}

function updateDatabase() {
  const dbPath = path.resolve(__dirname, '../../data/construproformas.db');
  console.log(`=== Actualizando base de datos SQLite en ${dbPath} ===`);
  const db = new Database(dbPath);

  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Categories: Rename CÀLCULO to CÁLCULO
    const oldCat = db.prepare('SELECT nombre FROM categories WHERE nombre = ?').get('CÀLCULO');
    const newCat = db.prepare('SELECT nombre FROM categories WHERE nombre = ?').get('CÁLCULO');

    if (oldCat) {
      if (!newCat) {
        db.prepare('INSERT INTO categories (nombre, descripcion) VALUES (?, ?)').run('CÁLCULO', null);
      }
      db.prepare('UPDATE item_catalog SET categoriaNombre = ? WHERE categoriaNombre = ?').run('CÁLCULO', 'CÀLCULO');
      db.prepare('DELETE FROM categories WHERE nombre = ?').run('CÀLCULO');
      console.log('Categoría CÀLCULO renombrada a CÁLCULO.');
    }

    // 2. Update item_catalog
    let itemsUpdated = 0;
    const updateItemStmt = db.prepare(`
      UPDATE item_catalog
      SET codigoSugerido = ?, descripcion = ?, categoriaNombre = COALESCE(?, categoriaNombre)
      WHERE id = ?
    `);

    const allItems = db.prepare('SELECT id, codigoSugerido, descripcion, categoriaNombre FROM item_catalog').all();
    for (const item of allItems) {
      const code = item.codigoSugerido || '';
      const corr = CORRECTIONS.find(c => c.code.toLowerCase() === code.toLowerCase());
      if (corr) {
        const targetCode = corr.newCode || item.codigoSugerido;
        const targetDesc = corr.newDesc;
        const targetCat = corr.newCat || item.categoriaNombre;

        if (
          item.codigoSugerido !== targetCode ||
          item.descripcion !== targetDesc ||
          item.categoriaNombre !== targetCat
        ) {
          updateItemStmt.run(targetCode, targetDesc, targetCat, item.id);
          itemsUpdated++;
        }
      }
    }
    console.log(`${itemsUpdated} rubros actualizados en item_catalog.`);

    // 3. Update proforma_details for any remaining inverted accents
    const details = db.prepare('SELECT id, descripcion FROM proforma_details').all();
    const updateDetailStmt = db.prepare('UPDATE proforma_details SET descripcion = ? WHERE id = ?');
    let detailsUpdated = 0;

    for (const d of details) {
      let desc = d.descripcion || '';
      const orig = desc;
      // Replace inverted accents
      desc = desc
        .replace(/À/g, 'Á')
        .replace(/È/g, 'É')
        .replace(/Ì/g, 'Í')
        .replace(/Ò/g, 'Ó')
        .replace(/Ù/g, 'Ú')
        .replace(/à/g, 'á')
        .replace(/è/g, 'é')
        .replace(/ì/g, 'í')
        .replace(/ò/g, 'ó')
        .replace(/ù/g, 'ú')
        .replace(/`/g, "'");

      // Replace known exact phrases
      CORRECTIONS.forEach(c => {
        if (desc.includes(c.oldDesc)) {
          desc = desc.replace(c.oldDesc, c.newDesc);
        }
      });

      if (desc !== orig) {
        updateDetailStmt.run(desc, d.id);
        detailsUpdated++;
      }
    }
    console.log(`${detailsUpdated} líneas de proforma saneadas en proforma_details.`);

    db.exec('COMMIT');
    console.log('Transacción de base de datos completada con éxito.');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Error al actualizar base de datos:', err);
    throw err;
  }
}

async function main() {
  await updateExcelFiles();
  updateDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
