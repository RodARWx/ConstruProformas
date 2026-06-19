/**
 * Genera una proforma de prueba CM-PROF-TEST-05 y exporta Excel (+ PDF si LibreOffice/Puppeteer disponible).
 * Uso: npm run build && npm run export:test
 */
const { mkdirSync, existsSync } = require('fs');
const { join } = require('path');

async function main() {
  process.env.DATABASE_PATH =
    process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'test-export.db');

  const exportsDir = join(process.cwd(), 'data', 'exports');
  mkdirSync(exportsDir, { recursive: true });

  const { buildProformaWorkbook } = require('../dist/src/export/helpers/proforma-excel-builder.helper');
  const { convertXlsxToPdf } = require('../dist/src/export/helpers/libreoffice.helper');
  const { ProformaStatus } = require('../dist/src/proformas/enums/proforma-status.enum');

  const proforma = {
    idProforma: 'CM-PROF-TEST-05',
    nombreProyecto: 'Validación Export Institucional',
    tiempoEjecucion: '12',
    fecha: '2026-06-19',
    notas: 'Nota adicional de prueba para validación local.',
    subtotal: 1500,
    iva: 225,
    totalGeneral: 1725,
    montoContrato: 1725,
    status: ProformaStatus.DRAFT,
    profile: {
      id: 1,
      nombre: 'Ing. Mario David Lincango Callatasig',
      cargo: 'Gerente General',
      registroSenescyt: '1005-2018-1984075',
      telefono: '0992914455',
      correo: 'mario.lincango@construmetrica.com',
    },
    customer: {
      id: 1,
      nombreCliente: 'Cliente Demo S.A.',
      rucCedula: '1790000000001',
      direccion: 'Quito, Ecuador',
      telefono: '0999999999',
      correo: 'demo@cliente.com',
    },
    detalles: [
      {
        id: 1,
        codigo: null,
        descripcion: 'TOPOGRAFÍA',
        tiempo: null,
        unidad: '-',
        cantidad: 0,
        costoUnitario: 0,
        total: 0,
        diasLaborables: 1,
        ivaPercentage: 0,
        esCategoria: true,
        proformaId: 'CM-PROF-TEST-05',
      },
      {
        id: 2,
        codigo: 'TOP-001',
        descripcion: 'Levantamiento topográfico planimétrico',
        tiempo: '5 días',
        unidad: 'ha',
        cantidad: 2,
        costoUnitario: 500,
        total: 1000,
        diasLaborables: 5,
        ivaPercentage: 15,
        esCategoria: false,
        proformaId: 'CM-PROF-TEST-05',
      },
      {
        id: 3,
        codigo: 'TOP-002',
        descripcion: 'Curvas de nivel y modelo digital',
        tiempo: '7 días',
        unidad: 'ha',
        cantidad: 1,
        costoUnitario: 500,
        total: 500,
        diasLaborables: 7,
        ivaPercentage: 15,
        esCategoria: false,
        proformaId: 'CM-PROF-TEST-05',
      },
    ],
  };

  const { workbook } = await buildProformaWorkbook(proforma);
  const xlsxPath = join(exportsDir, 'CM-PROF-TEST-05 - Validación Export Institucional.xlsx');
  await workbook.xlsx.writeFile(xlsxPath);
  console.log('Excel generado:', xlsxPath);

  const pdfResult = await convertXlsxToPdf(xlsxPath, exportsDir);
  if (pdfResult) {
    console.log(`PDF generado (${pdfResult.method}):`, pdfResult.pdfPath);
  } else {
    console.log('LibreOffice no disponible; omitiendo PDF (use Docker o instale LibreOffice).');
  }

  if (!existsSync(xlsxPath)) {
    process.exitCode = 1;
    console.error('Error: no se creó el archivo Excel.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
