/**
 * [SCRIPT DE DESARROLLO / PRUEBAS LOCALES]
 * Genera una proforma de prueba para verificar diseño y bordes visuales en Excel y PDF.
 * No interviene en el flujo de producción ni en la base de datos real.
 * Uso manual: npm run preview
 */
import { mkdirSync } from 'fs';
import { join } from 'path';
import { buildProformaWorkbook } from '../src/export/helpers/proforma-excel-builder.helper';
import { ProformaStatus } from '../src/proformas/enums/proforma-status.enum';
import { Proforma } from '../src/proformas/entities/proforma.entity';
import { ProformaHtmlPdfService } from '../src/export/services/proforma-html-pdf.service';

async function main() {
  const exportsDir = join(process.cwd(), 'data', 'exports');
  mkdirSync(exportsDir, { recursive: true });

  const proforma: Proforma = {
    idProforma: 'CM-PROF-PREVIEW',
    nombreProyecto: 'VISTA PREVIA DE DISEÑO Y BORDES',
    tiempoEjecucion: '12',
    tipoDias: 'Días Laborables',
    fecha: '2026-08-11',
    notas: '1. Los precios incluyen transporte y montaje.\n2. Validez de la oferta 30 días.',
    subtotal: 1500,
    iva: 225,
    totalGeneral: 1725,
    montoContrato: 1725,
    status: ProformaStatus.DRAFT,
    profile: {
      id: 1,
      nombre: 'Ing. Mario David Lincango Callatasig',
      cargo: 'GERENTE GENERAL CONSTRUMETRICA CIA. LTDA',
      registroSenescyt: '1005-2018-1984075',
      telefono: '0992914455',
      correo: 'mario.lincango@construmetrica.com',
      proformas: [],
    },
    customer: {
      id: 1,
      nombreCliente: 'CONSTRUCTORA ANDINA S.A.',
      rucCedula: '1790123456001',
      direccion: 'AV. AMAZONAS N12-34, QUITO',
      telefono: '0999999999',
      correo: 'info@constructoraandina.com',
      proformas: [],
    },
    detalles: [
      {
        id: 1,
        codigo: null,
        descripcion: '1. OBRAS PRELIMINARES',
        tiempo: null,
        unidad: '-',
        cantidad: 0,
        costoUnitario: 0,
        total: 0,
        diasLaborables: 0,
        ivaPercentage: 0,
        esCategoria: true,
        proformaId: 'CM-PROF-PREVIEW',
        proforma: null as any,
      },
      {
        id: 2,
        codigo: '01.01',
        descripcion: 'REPLANTEO Y NIVELACIÓN DE TERRENO',
        tiempo: '3 días',
        unidad: 'm2',
        cantidad: 150,
        costoUnitario: 2.50,
        total: 375,
        diasLaborables: 3,
        ivaPercentage: 15,
        esCategoria: false,
        proformaId: 'CM-PROF-PREVIEW',
        proforma: null as any,
      },
      {
        id: 3,
        codigo: '01.02',
        descripcion: 'EXCAVACIÓN MANUAL PARA CIMENTACIÓN DE ESTRUCTURA MEDIANTE RETIRADA DE MATERIAL DE LA EXCAVACIÓN Y ACARREO HASTA 20M. ',
        tiempo: '5 días',
        unidad: 'm3',
        cantidad: 45,
        costoUnitario: 12.00,
        total: 540,
        diasLaborables: 5,
        ivaPercentage: 15,
        esCategoria: false,
        proformaId: 'CM-PROF-PREVIEW',
        proforma: null as any,
      },
    ],
  } as any;

  console.log('Generando vista previa Excel...');
  const { workbook } = await buildProformaWorkbook(proforma);
  let outputPath = join(process.cwd(), 'preview.xlsx');
  try {
    await workbook.xlsx.writeFile(outputPath);
  } catch (err: any) {
    if (err.code === 'EBUSY') {
      outputPath = join(process.cwd(), 'preview_out.xlsx');
      await workbook.xlsx.writeFile(outputPath);
      console.log('⚠️ `preview.xlsx` está abierto en Excel. Se guardó como `preview_out.xlsx`');
    } else {
      throw err;
    }
  }

  console.log(`✅ ¡Vista previa generada con éxito en: ${outputPath}`);

  console.log('Generando vista previa PDF...');
  try {
    const pdfService = new ProformaHtmlPdfService();
    const pdfPath = join(process.cwd(), 'preview.pdf');
    await pdfService.renderToPdf(proforma, pdfPath);
    console.log(`✅ ¡Vista previa PDF generada con éxito en: ${pdfPath}`);
  } catch (err) {
    console.warn('⚠️ No se pudo generar PDF preview:', err);
  }
}

main().catch((err) => {
  console.error('Error generando vista previa:', err);
  process.exit(1);
});
