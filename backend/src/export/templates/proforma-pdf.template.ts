import { Proforma } from '../../proformas/entities/proforma.entity';
import {
  CLIENT_FIELD_LABELS,
  INSTITUTIONAL,
  INSTITUTIONAL_NOTES,
} from '../constants/institutional.constants';
import { formatCurrency, formatDate } from '../helpers/filename.helper';
import {
  buildExportRows,
  ExportRow,
  parseTiempoDias,
  sumTiempoDias,
} from '../helpers/proforma-excel-layout.helper';
import {
  BRAND_FONTS,
  buildBrandCssVariables,
} from '../constants/brand.constants';
import { buildBrandFontFaceCss } from '../helpers/brand-fonts.helper';

export interface ProformaHtmlAssets {
  logoBase64?: string;
  qrBase64?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNotes(proforma: Proforma): string[] {
  if (proforma.notas?.trim()) {
    return proforma.notas
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith('*') ? line : `*${line}`));
  }

  return INSTITUTIONAL_NOTES.map((line) => `*${line}`);
}

/** Genera HTML institucional con tabla completa, equivalente visual al Excel */
export function buildProformaHtmlDocument(
  proforma: Proforma,
  ivaRate: number,
  assets: ProformaHtmlAssets = {},
): string {
  const exportRows = buildExportRows(proforma.detalles);
  const totalDias = sumTiempoDias(proforma.detalles);
  const tiempoLabel =
    proforma.tiempoEjecucion?.trim() || `${totalDias} dias`;
  const notes = buildNotes(proforma);
  const { profile } = proforma;

  const logoImg = assets.logoBase64
    ? `<img class="logo" src="data:image/png;base64,${assets.logoBase64}" alt="Logo" />`
    : '';

  const qrImg = assets.qrBase64
    ? `<img class="qr" src="data:image/png;base64,${assets.qrBase64}" alt="QR validación" />`
    : '';

  const tableBody = exportRows
    .map((row: ExportRow) => {
      if (row.type === 'category') {
        return `<tr class="category"><td colspan="7">${escapeHtml(row.label)}</td></tr>`;
      }

      const d = row.detail;
      return `<tr class="item">
        <td class="code">${escapeHtml(d.codigo ?? '')}</td>
        <td class="desc">${escapeHtml(d.descripcion)}</td>
        <td class="center">${escapeHtml(String(parseTiempoDias(d.tiempo) ?? ''))}</td>
        <td class="center">${escapeHtml(d.unidad)}</td>
        <td class="num">${d.cantidad.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="num">${formatCurrency(d.costoUnitario)}</td>
        <td class="num">${formatCurrency(d.total)}</td>
      </tr>`;
    })
    .join('\n');

  const ivaLabel = proforma.appliesIva
    ? `IVA (${Math.round(ivaRate * 100)}%):`
    : 'IVA (0%):';
  const ivaValue = proforma.appliesIva
    ? formatCurrency(proforma.iva)
    : formatCurrency(0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Proforma ${escapeHtml(proforma.idProforma)}</title>
  <style>
    ${buildBrandFontFaceCss()}

    ${buildBrandCssVariables()}

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${BRAND_FONTS.body};
      font-size: 9pt;
      color: var(--brand-charcoal);
      line-height: 1.35;
    }

    .brand-accent {
      height: 4px;
      background: linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-coral) 100%);
      margin-bottom: 8px;
      border-radius: 1px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
      min-height: 48px;
    }

    .project-title {
      font-family: ${BRAND_FONTS.title};
      font-size: 10pt;
      color: var(--brand-maroon);
      max-width: 55%;
      padding-top: 4px;
    }

    .logo {
      height: 44px;
      width: auto;
      max-width: 160px;
      object-fit: contain;
    }

    .company-name {
      text-align: center;
      font-family: ${BRAND_FONTS.title};
      font-size: 12pt;
      color: var(--brand-charcoal);
      margin: 4px 0 6px;
    }

    .company-info {
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: var(--brand-charcoal);
      margin-bottom: 10px;
      gap: 12px;
    }

    .meta-table {
      width: 100%;
      margin-bottom: 12px;
      border-collapse: collapse;
    }

    .meta-table td {
      padding: 3px 0;
      vertical-align: top;
    }

    .meta-label {
      font-family: ${BRAND_FONTS.label};
      font-weight: bold;
      color: var(--brand-charcoal);
      width: 28%;
      white-space: nowrap;
    }

    .meta-value {
      width: 72%;
      color: var(--brand-charcoal);
    }

    table.proforma {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 8px;
    }

    table.proforma th,
    table.proforma td {
      border: 1px solid var(--brand-border);
      padding: 4px 5px;
      vertical-align: middle;
      word-wrap: break-word;
    }

    table.proforma thead th {
      background: var(--brand-maroon);
      color: var(--brand-white);
      font-family: ${BRAND_FONTS.title};
      text-align: center;
      font-size: 8pt;
      padding: 5px 3px;
      border-color: var(--brand-maroon);
    }

    table.proforma col.col-a { width: 9%; }
    table.proforma col.col-b { width: 38%; }
    table.proforma col.col-c { width: 10%; }
    table.proforma col.col-d { width: 8%; }
    table.proforma col.col-e { width: 11%; }
    table.proforma col.col-f { width: 12%; }
    table.proforma col.col-g { width: 12%; }

    tr.category td {
      background: var(--brand-category-tint);
      color: var(--brand-maroon);
      font-family: ${BRAND_FONTS.title};
      text-align: center;
      padding: 6px 4px;
      font-size: 9pt;
      border-color: var(--brand-coral);
    }

    tr.item td.desc { text-align: left; }
    tr.item td.code { text-align: left; font-size: 8.5pt; }
    td.center { text-align: center; }
    td.num { text-align: right; white-space: nowrap; }

    .totals-block {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      table-layout: fixed;
    }

    .totals-block td {
      padding: 5px 6px;
      border: 1px solid var(--brand-border);
      font-size: 9pt;
      color: var(--brand-charcoal);
    }

    .totals-block .no-border { border: none !important; }
    .totals-block .label {
      font-family: ${BRAND_FONTS.label};
      font-weight: bold;
      text-align: right;
    }
    .totals-block .amount { text-align: right; white-space: nowrap; }
    .totals-block .total-final {
      color: var(--brand-primary);
      font-family: ${BRAND_FONTS.label};
      font-weight: bold;
    }

    .footer-section { page-break-inside: avoid; break-inside: avoid; }

    .notes-title {
      font-family: ${BRAND_FONTS.title};
      color: var(--brand-maroon);
      margin-bottom: 6px;
      font-size: 9pt;
    }

    .notes-list {
      list-style: none;
      margin-bottom: 16px;
      padding-left: 0;
      font-size: 8.5pt;
      color: var(--brand-text-secondary);
    }

    .notes-list li { margin-bottom: 5px; text-align: justify; }

    .contact-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 8px;
    }

    .contact-info {
      font-size: 8.5pt;
      line-height: 1.5;
      color: var(--brand-charcoal);
    }

    .contact-info .title {
      font-family: ${BRAND_FONTS.title};
      color: var(--brand-maroon);
      margin-bottom: 4px;
    }

    .qr { width: 88px; height: 88px; object-fit: contain; }
  </style>
</head>
<body>
  <div class="brand-accent"></div>
  <div class="header-top">
    <div class="project-title">${escapeHtml(CLIENT_FIELD_LABELS.project)} ${escapeHtml(`${proforma.idProforma}-${proforma.nombreProyecto}`)}</div>
    ${logoImg}
  </div>

  <div class="company-name">${escapeHtml(INSTITUTIONAL.companyName)}</div>

  <div class="company-info">
    <span>${escapeHtml(INSTITUTIONAL.addressLabel)} ${escapeHtml(INSTITUTIONAL.address)}</span>
    <span>${escapeHtml(INSTITUTIONAL.rucLabel)} ${escapeHtml(INSTITUTIONAL.ruc)}</span>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-label">${escapeHtml(CLIENT_FIELD_LABELS.client)}</td>
      <td class="meta-value">${escapeHtml(proforma.customer.nombreCliente)}</td>
    </tr>
    <tr>
      <td class="meta-label">${escapeHtml(CLIENT_FIELD_LABELS.ruc)}</td>
      <td class="meta-value">${escapeHtml(proforma.customer.rucCedula)}</td>
    </tr>
    <tr>
      <td class="meta-label">${escapeHtml(CLIENT_FIELD_LABELS.contractAmount)}</td>
      <td class="meta-value">${formatCurrency(proforma.totalGeneral)}</td>
    </tr>
    <tr>
      <td class="meta-label">${escapeHtml(CLIENT_FIELD_LABELS.executionTime)}</td>
      <td class="meta-value">${escapeHtml(tiempoLabel)}</td>
    </tr>
    <tr>
      <td class="meta-label">${escapeHtml(CLIENT_FIELD_LABELS.date)}</td>
      <td class="meta-value">${escapeHtml(formatDate(proforma.fecha))}</td>
    </tr>
  </table>

  <table class="proforma">
    <colgroup>
      <col class="col-a" /><col class="col-b" /><col class="col-c" />
      <col class="col-d" /><col class="col-e" /><col class="col-f" /><col class="col-g" />
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">CÓDIGO</th>
        <th rowspan="2">D E S C R I P C I Ó N</th>
        <th>TIEMPO</th>
        <th rowspan="2">UNIDAD</th>
        <th colspan="3">C O N T R A T A D O</th>
      </tr>
      <tr>
        <th>DÍAS LABORABLES</th>
        <th>CANTIDAD</th>
        <th>C. UNIT.</th>
        <th>TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${tableBody}
    </tbody>
  </table>

  <table class="totals-block">
    <colgroup>
      <col style="width:9%" /><col style="width:38%" /><col style="width:10%" />
      <col style="width:8%" /><col style="width:11%" /><col style="width:12%" /><col style="width:12%" />
    </colgroup>
    <tr>
      <td class="no-border" colspan="2"></td>
      <td class="label">TOTAL EN DÍAS:</td>
      <td class="amount" colspan="1">${totalDias}</td>
      <td class="label">SUBTOTAL:</td>
      <td class="amount" colspan="2">${formatCurrency(proforma.subtotal)}</td>
    </tr>
    <tr>
      <td class="no-border" colspan="4"></td>
      <td class="label">${ivaLabel}</td>
      <td class="amount" colspan="2">${ivaValue}</td>
    </tr>
    <tr>
      <td class="no-border" colspan="4"></td>
      <td class="label total-final">TOTAL:</td>
      <td class="amount total-final" colspan="2">${formatCurrency(proforma.totalGeneral)}</td>
    </tr>
  </table>

  <div class="footer-section">
    <div class="notes-title">NOTAS:</div>
    <ul class="notes-list">
      ${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('\n')}
    </ul>

    <div class="contact-row">
      <div class="contact-info">
        <div class="title">Contacto:</div>
        <div>${escapeHtml(profile.nombre)}</div>
        <div>${escapeHtml(profile.cargo)}</div>
        <div>Reg. SENESCYT No. ${escapeHtml(profile.registroSenescyt ?? '—')}</div>
        <div>Teléf.: ${escapeHtml(profile.telefono ?? '—')}</div>
        <div>Correo: ${escapeHtml(profile.correo ?? '—')}</div>
      </div>
      ${qrImg}
    </div>
  </div>
</body>
</html>`;
}
