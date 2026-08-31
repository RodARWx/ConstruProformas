const ExcelJS = require('./node_modules/exceljs');
const path = require('path');

async function testBuild() {
  const templatePath = path.join(__dirname, 'templates/plantilla-proforma.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.worksheets[0];
  console.log('Template loaded. Sheet name:', sheet.name);

  // Test modifying cells
  sheet.getCell('B1').value = 'OBJETO DE COMPRA: CM-PROF-100 PROFORMA EDIFICIO CENTRAL';
  sheet.getCell('C4').value = 'CM-PROF-100';
  sheet.getCell('C5').value = 'JUAN PEREZ';
  sheet.getCell('C6').value = '1712345678';
  sheet.getCell('C7').value = 'AV. AMAZONAS N12-34';

  const outPath = path.join(__dirname, 'test_out.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log('Saved test output to:', outPath);
}

testBuild().catch(console.error);
