const ExcelJS = require('./node_modules/exceljs');
const path = require('path');

async function testTemplateLayout() {
  const templatePath = path.join(__dirname, 'templates/plantilla-proforma.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.worksheets[0];

  // Datos de prueba
  const proforma = {
    idProforma: 'CM-PROF-128',
    nombreProyecto: 'REMODELACIÓN OFICINAS TORRE A',
    fecha: '2026-07-29',
    tipoDias: 'Días Laborables',
    montoContrato: 4500.50,
    subtotal: 3913.48,
    iva: 587.02,
    totalGeneral: 4500.50,
    notas: '1. Los precios incluyen transporte y montaje.\n2. Validez de la oferta 30 días.',
    customer: {
      nombreCliente: 'CONSTRUCTORA ANDINA S.A.',
      rucCedula: '1790123456001',
      direccion: 'AV. AMAZONAS N12-34, QUITO',
    },
    profile: {
      nombre: 'Ing. Mario David Lincango Callatasig',
      cargo: 'GERENTE GENERAL CONSTRUMETRICA CIA. LTDA',
      telefono: '0992914455',
      correo: 'mario.lincango@construmetrica.com',
    },
    detalles: [
      { esCategoria: true, descripcion: '1. OBRAS PRELIMINARES' },
      { codigo: '01.01', descripcion: 'REPLANTEO Y NIVELACIÓN DE TERRENO', diasLaborables: 3, unidad: 'm2', cantidad: 150, costoUnitario: 2.50 },
      { codigo: '01.02', descripcion: 'EXCAVACIÓN MANUAL PARA CIMENTACIÓN', diasLaborables: 5, unidad: 'm3', cantidad: 45, costoUnitario: 12.00 },
      { esCategoria: true, descripcion: '2. ESTRUCTURA Y MAMPOSTERÍA' },
      { codigo: '02.01', descripcion: 'HORMIGÓN SIMPLE EN REPLANTILLO', diasLaborables: 4, unidad: 'm3', cantidad: 12, costoUnitario: 95.00 },
      { codigo: '02.02', descripcion: 'MAMPOSTERÍA DE BLOQUE DE HORMIGÓN 15CM', diasLaborables: 8, unidad: 'm2', cantidad: 210, costoUnitario: 11.50 },
    ]
  };

  // Header & Client
  sheet.getCell('B1').value = `OBJETO DE COMPRA: ${proforma.idProforma} PROFORMA ${proforma.nombreProyecto}`;
  sheet.getCell('C4').value = proforma.idProforma;
  sheet.getCell('C5').value = proforma.customer.nombreCliente;
  sheet.getCell('C6').value = proforma.customer.rucCedula;
  sheet.getCell('C7').value = proforma.customer.direccion;

  // Clear rows 13 to end and unmerge
  const maxRow = sheet.rowCount;
  for (let r = 13; r <= maxRow; r++) {
    try {
      sheet.unMergeCells(`A${r}:G${r}`);
    } catch {}
    sheet.getRow(r).values = [];
  }

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  let currentRow = 13;

  proforma.detalles.forEach((linea) => {
    const row = sheet.getRow(currentRow);
    if (linea.esCategoria) {
      sheet.mergeCells(`A${currentRow}:G${currentRow}`);
      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBECE8' } };
      }
      const cell = row.getCell(1);
      cell.value = linea.descripcion;
      cell.font = { name: 'Gotham Black', size: 12, bold: true, color: { argb: 'FF550012' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      row.height = 24;
    } else {
      row.getCell(1).value = linea.codigo;
      row.getCell(2).value = linea.descripcion;
      row.getCell(3).value = linea.diasLaborables;
      row.getCell(4).value = linea.unidad;
      row.getCell(5).value = linea.cantidad;
      row.getCell(6).value = linea.costoUnitario;
      row.getCell(7).value = { formula: `E${currentRow}*F${currentRow}` };

      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = { name: 'Gotham Book', size: 12, color: { argb: 'FF444242' } };
        if (c === 5) cell.numFmt = '#,##0.00';
        if (c === 6 || c === 7) cell.numFmt = '$#,##0.00';
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 || c === 3 || c === 4 ? 'center' : c >= 5 ? 'right' : 'left',
          wrapText: c === 2,
        };
      }
      row.height = 22;
    }
    currentRow++;
  });

  const lastItemRow = currentRow - 1;

  // Totales
  // TOTAL DÍAS
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = thinBorder;
  sheet.getCell(`A${currentRow}`).value = 'TOTAL DÍAS';
  sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = { formula: `SUM(C13:C${lastItemRow})` };
  sheet.getCell(`G${currentRow}`).font = { name: 'Gotham Book', size: 12 };
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  const totalDiasRow = currentRow;
  currentRow++;

  // SUBTOTAL
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = thinBorder;
  sheet.getCell(`A${currentRow}`).value = 'SUBTOTAL:';
  sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = { formula: `SUM(G13:G${lastItemRow})` };
  sheet.getCell(`G${currentRow}`).font = { name: 'Gotham Book', size: 12 };
  sheet.getCell(`G${currentRow}`).numFmt = '$#,##0.00';
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  const subtotalRow = currentRow;
  currentRow++;

  // IVA
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = thinBorder;
  sheet.getCell(`A${currentRow}`).value = 'IVA(15%):';
  sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = { formula: `0.15*G${subtotalRow}` };
  sheet.getCell(`G${currentRow}`).font = { name: 'Gotham Book', size: 12 };
  sheet.getCell(`G${currentRow}`).numFmt = '$#,##0.00';
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  const ivaRow = currentRow;
  currentRow++;

  // TOTAL
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  for (let c = 1; c <= 7; c++) sheet.getRow(currentRow).getCell(c).border = thinBorder;
  sheet.getCell(`A${currentRow}`).value = 'TOTAL:';
  sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true, color: { argb: 'FFFF0033' } };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`G${currentRow}`).value = { formula: `G${subtotalRow}+G${ivaRow}` };
  sheet.getCell(`G${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true, color: { argb: 'FFFF0033' } };
  sheet.getCell(`G${currentRow}`).numFmt = '$#,##0.00';
  sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  const totalRow = currentRow;
  currentRow += 2;

  // Header formulas
  sheet.getCell('C8').value = { formula: `+G${totalRow}` };
  sheet.getCell('C9').value = { formula: `C${totalDiasRow}&" "&"${proforma.tipoDias}"` };

  // NOTAS
  sheet.mergeCells(`A${currentRow}:G${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = 'NOTAS:';
  sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true };
  currentRow++;

  const notes = ['1. Los precios incluyen transporte y montaje.', '2. Validez de la oferta 30 días.'];
  notes.forEach((note) => {
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const cell = sheet.getCell(`A${currentRow}`);
    cell.value = note;
    cell.font = { name: 'Gotham Book', size: 12, color: { argb: 'FF777777' } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(currentRow).height = 20;
    currentRow++;
  });
  currentRow++;

  // Contacto
  sheet.mergeCells(`A${currentRow}:G${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = 'Contacto:';
  sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Black', size: 12, bold: true };
  currentRow++;

  [proforma.profile.nombre, proforma.profile.cargo, proforma.profile.telefono, proforma.profile.correo].forEach((line) => {
    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = line;
    sheet.getCell(`A${currentRow}`).font = { name: 'Gotham Book', size: 12 };
    currentRow++;
  });

  await workbook.xlsx.writeFile(path.join(__dirname, 'test_template_out.xlsx'));
  console.log('Successfully wrote test_template_out.xlsx!');
}

testTemplateLayout().catch(console.error);
