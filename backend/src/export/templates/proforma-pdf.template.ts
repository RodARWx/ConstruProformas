import { Proforma } from '../../proformas/entities/proforma.entity';
import { resolveProformaCustomerSnapshot } from '../../proformas/helpers/proforma-customer-snapshot.helper';
import { BRAND_FONTS } from '../constants/brand.constants';
import { INSTITUTIONAL_COMPANY } from '../constants/institutional.constants';
import { buildUserNotesForExport } from '../../proformas/helpers/proforma-notes.helper';
import { buildEmbeddedFontCss } from '../helpers/brand-fonts.helper';
import { formatCurrency, formatDate } from '../helpers/filename.helper';

export function renderProformaHtml(
  proforma: Proforma,
  qrDataUrl?: string,
  logoDataUrl?: string,
): string {
  const fontCss = buildEmbeddedFontCss();
  const showIva = proforma.iva > 0;

  const itemRows = proforma.detalles
    .map((linea) => {
      if (linea.esCategoria) {
        return `<tr class="row-category"><td colspan="7">${escapeHtml(linea.descripcion)}</td></tr>`;
      }
      return `<tr class="row-item">
        <td class="cell-center">${escapeHtml(linea.codigo ?? '')}</td>
        <td>${escapeHtml(linea.descripcion)}</td>
        <td class="cell-center">${linea.diasLaborables}</td>
        <td class="cell-center">${escapeHtml(linea.unidad)}</td>
        <td class="cell-center">${linea.cantidad.toFixed(2)}</td>
        <td class="cell-right">${formatCurrency(linea.costoUnitario)}</td>
        <td class="cell-right">${formatCurrency(linea.total)}</td>
      </tr>`;
    })
    .join('\n');

  const notes = buildUserNotesForExport(proforma.notas);
  const notesHtml = notes
    .map((note) => `<p>${escapeHtml(note)}</p>`)
    .join('\n');

  const profile = proforma.profile;
  const customer = resolveProformaCustomerSnapshot(proforma);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Proforma ${escapeHtml(proforma.idProforma)}</title>
  <style>
    ${fontCss}

    /* ------- Reset y Base ------- */
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      background-color: #ffffff;
      font-family: '${BRAND_FONTS.book}', 'Gotham', Arial, sans-serif;
      font-size: 12px;
      color: #000000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    *, *::before, *::after {
      box-sizing: inherit;
    }

    /* ------- Contenedor principal (borde negro exterior) ------- */
    .page-container {
      border: 2px solid #000000;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    /* ------- Estilos compartidos de secciones ------- */
    section, footer {
      border-bottom: 1.5px solid #000000;
    }

    .section-footer {
      border-bottom: none;
    }

    /* ============================================
       SECCIÓN 1: ENCABEZADO / OBJETO DE COMPRA
       ============================================ */
    .section-header {
      display: flex;
      align-items: center;
      padding: 8px 14px;
      min-height: 46px;
    }

    .header-left {
      flex-shrink: 0;
      margin-right: 6px;
    }

    .header-center {
      flex: 1;
      font-weight: lighter;
      text-align: center;
      font-size: 14px;
    }

    .header-right {
      flex-shrink: 0;
      margin-left: 10px;
    }

    .logo {
      height: 38px;
      width: auto;
      display: block;
    }

    /* ============================================
       SECCIÓN 2: RAZÓN SOCIAL (centrada)
       ============================================ */
    .section-razon-social {
      text-align: center;
      padding: 4px 14px;
      font-weight: bold;
    }

    .section-razon-social p {
      margin: 0;
    }

    /* ============================================
       SECCIÓN 3: DIRECCIÓN Y RUC EMPRESA
       ============================================ */
    .section-empresa {
      padding: 4px 14px;
    }

    .empresa-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .empresa-col-left {
      flex: 1;
    }

    .empresa-col-right {
      flex-shrink: 0;
      text-align: right;
    }

    /* ============================================
       SECCIÓN 4: INFORMACIÓN DEL CLIENTE
       ============================================ */
    .section-cliente {
      padding: 3px 14px 4px 14px;
      border-bottom: none;
    }

    .cliente-row {
      display: flex;
      align-items: baseline;
      line-height: 1.55;
    }

    .cliente-row .label-bold {
      flex-shrink: 0;
      min-width: 165px;
    }

    .cliente-value {
      margin-left: 20px;
    }

    /* ============================================
       SECCIÓN 5: TABLA DE RUBROS
       ============================================ */
    .section-rubros {
      padding: 0;
    }

    .rubros-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    /* Anchos de columnas */
    .col-codigo      { width: 9%; }
    .col-descripcion { width: 30%; }
    .col-tiempo      { width: 10%; }
    .col-unidad      { width: 10%; }
    .col-cantidad    { width: 9%; }
    .col-cunit       { width: 9%; }
    .col-total       { width: 9%; }

    /* Cabecera */
    .rubros-table thead th {
      background-color: #550012;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      padding: 2px 3px;
      border: 1px solid #000000;
      letter-spacing: 0.5px;
      margin: 0px;
    }

    .rubros-table thead th:first-child {
      border-left: none;
    }
    .rubros-table thead th:last-child {
      border-right: none;
    }

    /* Celdas del cuerpo */
    .rubros-table tbody td {
      padding: 3px 5px;
      border: 1px solid #000000;
      vertical-align: middle;
    }

    .rubros-table tbody td:first-child {
      border-left: none;
    }
    .rubros-table tbody td:last-child {
      border-right: none;
    }

    /* Fila TOTAL DÍAS */
    .rubros-table .row-total-dias td {
      border: none;
    }

    .rubros-table .row-total-dias .cell-total-dias {
      border: 1px solid #000000;
    }

    /* Filas de categoría */
    .row-category td {
      background-color: #fbece8;
      font-weight: bold;
      color: #550012;
      padding: 3px 6px;
      border-left: none;
      border-right: none;
    }

    .text-right-bold {
      text-align: right;
      font-weight: bold;
    }

    /* Alineaciones de celdas */
    .cell-center { text-align: center; }
    .cell-right  { text-align: right; }

    /* ---- Totales (Subtotal, IVA, Total) ---- */
    .totales-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 2px 14px 6px 0;
    }

    .total-row {
      display: flex;
      justify-content: flex-end;
      font-weight: bold;
      line-height: 1.5;
    }

    .total-label {
      text-align: right;
      margin-right: 10px;
      min-width: 80px;
    }

    .total-value {
      text-align: right;
      min-width: 70px;
    }

    .total-final {
      color: #ff0000;
    }

    /* ============================================
       SECCIÓN 6: NOTAS
       ============================================ */
    .section-notas {
      border-bottom: none;
      padding: 6px 14px;
      flex: 1;
    }

    .section-notas .notas-title {
      font-weight: bold;
      margin: 0 0 1px 0;
    }

    .section-notas p {
      margin: 0.5px 0;
      font-size: 10px;
      line-height: 1.3;
    }

    /* ============================================
       SECCIÓN 7: PIE DE PÁGINA (Contacto + QR)
       ============================================ */
    .section-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 8px 14px;
      margin-top: auto;
    }

    .footer-left {
      flex: 1;
    }

    .contacto-row {
      display: flex;
      align-items: flex-start;
    }

    .contacto-label {
      flex-shrink: 0;
      margin-right: 14px;
      padding-top: 0;
    }

    .contacto-info p {
      margin: 0;
      line-height: 1.55;
    }

    .contacto-cargo {
      font-weight: bold;
      letter-spacing: 0.3px;
    }

    .footer-right {
      flex-shrink: 0;
      margin-left: 20px;
    }

    .qr-code {
      width: 105px;
      height: 105px;
      display: block;
    }

    /* ============================================
       UTILIDADES
       ============================================ */
    .label-bold {
      font-weight: bold;
    }

    .text-red {
      color: #ff0000;
    }
  </style>
</head>
<body>

  <div class="page-container">

    <!-- SECCIÓN 1: ENCABEZADO / OBJETO DE COMPRA -->
    <section class="section-header">
      <div class="header-left">
        <span class="label-bold">OBJETO DE COMPRA:</span>
      </div>
      <div class="header-center">
        ${escapeHtml(proforma.idProforma)} PROFORMA ${escapeHtml(proforma.nombreProyecto)}
      </div>
      <div class="header-right">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="CONSTRUMÉTRICA" class="logo">` : ''}
      </div>
    </section>

    <!-- SECCIÓN 2: RAZÓN SOCIAL -->
    <section class="section-razon-social">
      <p>RAZON SOCIAL: ${escapeHtml(INSTITUTIONAL_COMPANY.razonSocial)}</p>
    </section>

    <!-- SECCIÓN 3: DIRECCIÓN Y RUC DE LA EMPRESA -->
    <section class="section-empresa">
      <div class="empresa-row">
        <div class="empresa-col-left">
          <span class="label-bold">DIRECCIÓN:</span>
          <span>${escapeHtml(INSTITUTIONAL_COMPANY.direccion)}</span>
        </div>
        <div class="empresa-col-right">
          <span class="label-bold">RUC:</span>
          <span>${escapeHtml(INSTITUTIONAL_COMPANY.ruc)}</span>
        </div>
      </div>
    </section>

    <!-- SECCIÓN 4: INFORMACIÓN DEL CLIENTE -->
    <section class="section-cliente">
      <div class="cliente-row">
        <span class="label-bold">PROFORMA N°:</span>
        <span class="cliente-value">${escapeHtml(proforma.idProforma)}</span>
      </div>
      <div class="cliente-row">
        <span class="label-bold">CLIENTE:</span>
        <span class="cliente-value">${escapeHtml(customer.nombreCliente)}</span>
      </div>
      <div class="cliente-row">
        <span class="label-bold">RUC/CÉDULA:</span>
        <span class="cliente-value">${escapeHtml(customer.rucCedula)}</span>
      </div>
      ${customer.direccion ? `<div class="cliente-row">
        <span class="label-bold">DIRECCIÓN:</span>
        <span class="cliente-value">${escapeHtml(customer.direccion)}</span>
      </div>` : ''}
      <div class="cliente-row">
        <span class="label-bold">MONTO DEL CONTRATO:</span>
        <span class="cliente-value text-red">${formatCurrency(proforma.montoContrato)}</span>
      </div>
      <div class="cliente-row">
        <span class="label-bold">TIEMPO DE ENTREGA:</span>
        <span class="cliente-value">${escapeHtml(proforma.tiempoEjecucion ?? '0')} Días Calendario</span>
      </div>
    </section>

    <!-- SECCIÓN 5: TABLA DE RUBROS -->
    <section class="section-rubros">
      <table class="rubros-table">
        <thead>
          <tr class="thead-row-1">
            <th class="col-codigo" rowspan="2">CÓDIGO</th>
            <th class="col-descripcion" rowspan="2">D &nbsp;E &nbsp;S &nbsp;C &nbsp;R &nbsp;I &nbsp;P &nbsp;C &nbsp;I &nbsp;Ó &nbsp;N</th>
            <th class="col-tiempo">TIEMPO</th>
            <th class="col-unidad" rowspan="2">UNIDAD</th>
            <th class="col-contrato" colspan="3">C &nbsp;O &nbsp;N &nbsp;T &nbsp;R &nbsp;A &nbsp;T &nbsp;O</th>
          </tr>
          <tr class="thead-row-2">
            <th class="col-tiempo">DÍAS</th>
            <th class="col-cantidad">CANTIDAD</th>
            <th class="col-cunit">C. UNIT.</th>
            <th class="col-total">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}

          <!-- Fila TOTAL DÍAS -->
          <tr class="row-total-dias">
            <td></td>
            <td class="text-right-bold">TOTAL DÍAS</td>
            <td class="cell-center cell-total-dias">${escapeHtml(proforma.tiempoEjecucion ?? '0')}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Totales -->
      <div class="totales-container">
        <div class="total-row">
          <span class="total-label">SUBTOTAL:</span>
          <span class="total-value">${formatCurrency(proforma.subtotal)}</span>
        </div>
        ${showIva ? `<div class="total-row">
          <span class="total-label">IVA(15%):</span>
          <span class="total-value">${formatCurrency(proforma.iva)}</span>
        </div>` : ''}
        <div class="total-row total-final">
          <span class="total-label">TOTAL:</span>
          <span class="total-value">${formatCurrency(proforma.totalGeneral)}</span>
        </div>
      </div>
    </section>

    <!-- SECCIÓN 6: NOTAS -->
    <section class="section-notas">
      <p class="notas-title">NOTAS:</p>
      ${notesHtml}
    </section>

    <!-- SECCIÓN 7: PIE DE PÁGINA (Contacto + QR) -->
    <footer class="section-footer">
      <div class="footer-left">
        <div class="contacto-row">
          <span class="label-bold contacto-label">Contacto:</span>
          <div class="contacto-info">
            <p>${escapeHtml(profile.nombre)}</p>
            <p class="contacto-cargo">${escapeHtml(profile.cargo)}</p>
            ${profile.telefono ? `<p>Teléf.: ${escapeHtml(profile.telefono)}</p>` : ''}
            ${profile.correo ? `<p>Correo: ${escapeHtml(profile.correo)}</p>` : ''}
          </div>
        </div>
      </div>
      <div class="footer-right">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR WhatsApp" class="qr-code">` : ''}
      </div>
    </footer>

  </div>

</body>
</html>`;
}

function escapeHtml(value: string | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
