/**
 * Genera archivos Excel y PDF de prueba con categorías.
 * Uso: npm run build && node scripts/generate-test-export.js
 */
const { mkdirSync } = require('fs');
const { join } = require('path');

process.env.DATABASE_PATH = join(__dirname, '../data/construproformas.db');
process.env.IVA_RATE = '0.15';
process.env.PROFORMA_VALIDATION_BASE_URL = 'https://construmetrica.com/validar';

const {
  ProformaExcelExportService,
} = require('../dist/export/services/proforma-excel-export.service');
const {
  ProformaPdfExportService,
} = require('../dist/export/services/proforma-pdf-export.service');
const {
  ProformaHtmlPdfService,
} = require('../dist/export/services/proforma-html-pdf.service');
const {
  calculateProformaTotals,
} = require('../dist/proformas/helpers/proforma-calculator.helper');
const {
  ProformaStatus,
} = require('../dist/proformas/enums/proforma-status.enum');

const configService = {
  get: (key, defaultValue) => process.env[key] ?? defaultValue,
};

const detallesInput = [
  { esCategoria: true, descripcion: '1. ESTUDIOS PREVIOS Y ANÁLISIS' },
  {
    codigo: '1.1',
    descripcion: 'Estudio de suelos y caracterización geotécnica',
    tiempo: '4',
    unidad: 'u',
    cantidad: 1,
    costoUnitario: 850,
  },
  {
    codigo: '1.2',
    descripcion: 'Análisis de estabilidad de taludes',
    tiempo: '3',
    unidad: 'u',
    cantidad: 2,
    costoUnitario: 420,
  },
  { esCategoria: true, descripcion: '2. DISEÑO VIAL Y PAVIMENTO' },
  {
    codigo: '2.1',
    descripcion: 'Diseño geométrico de la vía',
    tiempo: '5',
    unidad: 'Glb',
    cantidad: 11462.45,
    costoUnitario: 0.32,
  },
  {
    codigo: '2.2',
    descripcion: 'Replanteo topográfico de ejes y curvas',
    tiempo: '2',
    unidad: 'km',
    cantidad: 3.5,
    costoUnitario: 180,
  },
  { esCategoria: true, descripcion: '3. INFORMES Y ENTREGABLES' },
  {
    codigo: '3.1',
    descripcion: 'Informe técnico final con planos PDF y DWG',
    tiempo: '3',
    unidad: 'u',
    cantidad: 1,
    costoUnitario: 650,
  },
];

(async () => {
  mkdirSync(join(__dirname, '../data'), { recursive: true });

  const calculated = calculateProformaTotals(detallesInput, true, 0.15);

  const proforma = {
    idProforma: 'CM-PROF-TEST-05',
    nombreProyecto: 'PROFORMA DISEÑO VIAL SEDEMI (GUAYAQUIL)',
    tiempoEjecucion: '17 días',
    fecha: '2026-06-16',
    notas: null,
    subtotal: calculated.subtotal,
    iva: calculated.iva,
    totalGeneral: calculated.totalGeneral,
    appliesIva: true,
    status: ProformaStatus.DRAFT,
    profileId: 1,
    customerId: 1,
    profile: {
      id: 1,
      nombre: 'Ing. Mario David Lincango Callatasig',
      cargo: 'GERENTE GENERAL',
      registroSenescyt: '1005-2018-1984075',
      telefono: '0992914455',
      correo: 'mario.lincango@construmetrica.com',
    },
    customer: {
      id: 1,
      nombreCliente: 'SEDEMI',
      rucCedula: '1790123456001',
      direccion: 'Guayaquil, Ecuador',
      telefono: '042123456',
      correo: 'contacto@sedemi.com',
    },
    detalles: calculated.detalles.map((linea, index) => ({
      id: index + 1,
      proformaId: 'CM-PROF-TEST-05',
      codigo: linea.codigo ?? null,
      descripcion: linea.descripcion,
      tiempo: linea.tiempo ?? null,
      unidad: linea.unidad ?? '',
      cantidad: linea.cantidad ?? 0,
      costoUnitario: linea.costoUnitario ?? 0,
      total: linea.total,
      esCategoria: linea.esCategoria ?? false,
    })),
  };

  const excelService = new ProformaExcelExportService(configService);
  const pdfService = new ProformaPdfExportService(
    new ProformaHtmlPdfService(configService),
  );

  const excel = await excelService.export(proforma);
  console.log('Excel:', excel.absolutePath);

  const pdf = await pdfService.exportFromExcel(excel.absolutePath, proforma);
  console.log('PDF:  ', pdf.absolutePath);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
