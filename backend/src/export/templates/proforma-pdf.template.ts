import { Proforma } from '../../proformas/entities/proforma.entity';
import { resolveProformaCustomerSnapshot } from '../../proformas/helpers/proforma-customer-snapshot.helper';
import { BRAND_COLORS, BRAND_FONTS, BRAND_FONT_SIZE } from '../constants/brand.constants';
import { INSTITUTIONAL_COMPANY, INSTITUTIONAL_NOTES } from '../constants/institutional.constants';
import { buildUserNotesForExport } from '../../proformas/helpers/proforma-notes.helper';
import { buildEmbeddedFontCss } from '../helpers/brand-fonts.helper';
import { formatCurrency, formatDate } from '../helpers/filename.helper';
import { getValidationUrl } from '../helpers/qr-code.helper';

export function renderProformaHtml(
  proforma: Proforma,
  qrDataUrl?: string,
  logoDataUrl?: string,
  descuentoTotal: number = 0,
  descuentoPorcentaje: number = 0,
): string {
  const fontCss = buildEmbeddedFontCss();
  const showIva = proforma.iva > 0;

  const itemRows = proforma.detalles
    .map((linea) => {
      if (linea.esCategoria) {
        return `<tr class="category"><td colspan="7">${escapeHtml(linea.descripcion)}</td></tr>`;
      }
      return `<tr class="item">
        <td>${escapeHtml(linea.codigo ?? '')}</td>
        <td>${escapeHtml(linea.descripcion)}</td>
        <td class="num">${linea.diasLaborables}</td>
        <td>${escapeHtml(linea.unidad)}</td>
        <td class="num">${linea.cantidad.toFixed(2)}</td>
        <td class="num">${formatCurrency(linea.costoUnitario)}</td>
        <td class="num">${formatCurrency(linea.total)}</td>
      </tr>`;
    })
    .join('\n');

  const notes = [...INSTITUTIONAL_NOTES, ...buildUserNotesForExport(proforma.notas)];
  const notesHtml = notes.map((note) => `<p class="note-line">${escapeHtml(note)}</p>`).join('\n');

  const profile = proforma.profile;
  const customer = resolveProformaCustomerSnapshot(proforma);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Proforma ${escapeHtml(proforma.idProforma)}</title>
  <style>
    ${fontCss}
    * { box-sizing: border-box; }
    body {
      font-family: '${BRAND_FONTS.book}', Arial, sans-serif;
      color: ${BRAND_COLORS.charcoal};
      font-size: ${BRAND_FONT_SIZE}px;
      margin: 0;
      padding: 24px;
    }
    h1, h2, h3, .title, .section-title, .category td, .totals .total-label {
      font-family: '${BRAND_FONTS.black}', 'Arial Black', sans-serif;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .header-left { flex: 1; }
    .header-right { margin-left: 16px; }
    .header-right img { max-height: 48px; width: auto; }
    .project { font-size: ${BRAND_FONT_SIZE}px; margin-bottom: 8px; }
    .company { text-align: center; font-size: ${BRAND_FONT_SIZE}px; margin: 4px 0; }
    .company-meta { text-align: center; font-size: ${BRAND_FONT_SIZE}px; color: ${BRAND_COLORS.secondaryText}; }
    .meta-grid { margin: 16px 0; }
    .meta-row { display: flex; margin-bottom: 4px; }
    .meta-label { width: 140px; font-family: '${BRAND_FONTS.black}', 'Arial Black', sans-serif; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 12px; }
    table.items th {
      background: ${BRAND_COLORS.burgundy};
      color: ${BRAND_COLORS.white};
      font-size: ${BRAND_FONT_SIZE}px;
      padding: 6px 4px;
      border: 1px solid ${BRAND_COLORS.softBorder};
      text-align: center;
    }
    table.items td {
      border: 1px solid ${BRAND_COLORS.softBorder};
      padding: 4px;
      font-size: ${BRAND_FONT_SIZE}px;
      vertical-align: top;
    }
    tr.category td {
      background: ${BRAND_COLORS.categoryTint};
      color: ${BRAND_COLORS.burgundy};
      text-align: center;
      font-weight: bold;
      padding: 6px;
    }
    td.num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 12px; width: 100%; }
    .totals-row { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 4px; }
    .totals-row .label { min-width: 120px; text-align: right; }
    .totals-row .value { min-width: 90px; text-align: right; }
    .totals-row.total .label, .totals-row.total .value {
      color: ${BRAND_COLORS.primaryRed};
      font-family: '${BRAND_FONTS.black}', 'Arial Black', sans-serif;
      font-size: ${BRAND_FONT_SIZE}px;
    }
    .totals-row.discount .label, .totals-row.discount .value {
      color: ${BRAND_COLORS.burgundy};
      font-weight: bold;
    }
    .notes { margin-top: 16px; }
    .notes .section-title { margin-bottom: 6px; }
    .note-line { color: ${BRAND_COLORS.secondaryText}; margin: 2px 0; font-size: ${BRAND_FONT_SIZE}px; }
    .contact { margin-top: 12px; }
    .footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .qr img { width: 90px; height: 90px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="project">PROYECTO: ${escapeHtml(proforma.idProforma)}-${escapeHtml(proforma.nombreProyecto)}</div>
      <div class="company">${escapeHtml(INSTITUTIONAL_COMPANY.nombre)}</div>
      <div class="company-meta">${escapeHtml(INSTITUTIONAL_COMPANY.direccion)}</div>
      <div class="company-meta">RUC: ${escapeHtml(INSTITUTIONAL_COMPANY.ruc)}</div>
    </div>
    ${logoDataUrl ? `<div class="header-right"><img src="${logoDataUrl}" alt="Logo" /></div>` : ''}
  </div>

  <div class="meta-grid">
    <div class="meta-row"><span class="meta-label">CLIENTE</span><span>${escapeHtml(customer.nombreCliente)}</span></div>
    <div class="meta-row"><span class="meta-label">RUC</span><span>${escapeHtml(customer.rucCedula)}</span></div>
    <div class="meta-row"><span class="meta-label">MONTO CONTRATO</span><span>${formatCurrency(proforma.montoContrato)}</span></div>
    <div class="meta-row"><span class="meta-label">TIEMPO EJECUCIÓN</span><span>${escapeHtml(proforma.tiempoEjecucion ?? '0')} días</span></div>
    <div class="meta-row"><span class="meta-label">FECHA</span><span>${formatDate(proforma.fecha)}</span></div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th rowspan="2">CÓDIGO</th>
        <th rowspan="2">DESCRIPCIÓN</th>
        <th rowspan="2">TIEMPO / DÍAS LABORABLES</th>
        <th rowspan="2">UNIDAD</th>
        <th colspan="3">CONTRATADO</th>
      </tr>
      <tr>
        <th>CANTIDAD</th>
        <th>C. UNIT.</th>
        <th>TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span class="label">TOTAL EN DÍAS</span><span class="value">${escapeHtml(proforma.tiempoEjecucion ?? '0')} días</span></div>
    <div class="totals-row"><span class="label">SUBTOTAL</span><span class="value">${formatCurrency(proforma.subtotal)}</span></div>
    ${descuentoTotal > 0 ? `
    <div class="totals-row discount">
      <span class="label">DESCUENTO (${descuentoPorcentaje.toFixed(2)}%)</span>
      <span class="value">-${formatCurrency(descuentoTotal)}</span>
    </div>
    <div class="totals-row"><span class="label">SUBTOTAL CON DESCUENTO</span><span class="value">${formatCurrency(proforma.subtotal - descuentoTotal)}</span></div>
    ` : ''}
    ${showIva ? `<div class="totals-row"><span class="label">IVA</span><span class="value">${formatCurrency(proforma.iva)}</span></div>` : ''}
    <div class="totals-row total"><span class="label total-label">TOTAL</span><span class="value">${formatCurrency(proforma.totalGeneral)}</span></div>
  </div>

  <div class="notes">
    <div class="section-title">NOTAS:</div>
    ${notesHtml}
  </div>

  <div class="contact">
    <div class="section-title">Contacto:</div>
    <div>${escapeHtml(profile.nombre)}</div>
    <div>${escapeHtml(profile.cargo)}</div>
    ${profile.registroSenescyt ? `<div>Registro SENESCYT: ${escapeHtml(profile.registroSenescyt)}</div>` : ''}
    ${profile.telefono ? `<div>Tel: ${escapeHtml(profile.telefono)}</div>` : ''}
    ${profile.correo ? `<div>${escapeHtml(profile.correo)}</div>` : ''}
  </div>

  <div class="footer">
    <div>Validación: ${escapeHtml(getValidationUrl(proforma.idProforma))}</div>
    ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="QR validación" /></div>` : ''}
  </div>
</body>
</html>`;
}

function escapeHtml(value: any): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}