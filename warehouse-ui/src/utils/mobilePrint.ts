import type { PrintInvoiceData } from '../components/common/InvoicePrintModal';
import { buildQrPayload } from '../components/common/InvoicePrintModal';
import { formatCurrency } from './helpers';
import dayjs from 'dayjs';

/**
 * Opens a new window with a full A4-formatted invoice and auto-triggers print.
 * Works on Android Chrome (auto-print) and iOS Safari (shows print button).
 */
export function mobilePrintInvoice(data: PrintInvoiceData): void {
  const qr = buildQrPayload(data);
  const dateStr = dayjs(data.date).format('DD.MM.YYYY HH:mm');
  const locationLabel = data.shopTitle ?? data.warehouseTitle ?? '—';
  const locationKey = data.shopTitle ? 'Магазин / Дӯкон' : 'Склад / Анбор';

  const rows = data.products.map((p, i) => {
    const lineTotal = p.totalPrice ?? p.unitPrice * p.quantity;
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8faff'}">
      <td style="padding:7px 8px;border:1px solid #e0e7ff;text-align:center;color:#9ca3af">${i + 1}</td>
      <td style="padding:7px 8px;border:1px solid #e0e7ff;font-weight:500">${p.productName}</td>
      <td style="padding:7px 8px;border:1px solid #e0e7ff;text-align:center">${p.quantity}</td>
      <td style="padding:7px 8px;border:1px solid #e0e7ff;text-align:right">${formatCurrency(p.unitPrice)}</td>
      <td style="padding:7px 8px;border:1px solid #e0e7ff;text-align:right;font-weight:600">${formatCurrency(lineTotal)}</td>
    </tr>`;
  }).join('');

  const grandTotal = data.products.reduce((s, p) => s + (p.totalPrice ?? p.unitPrice * p.quantity), 0);

  const statusBadge = data.paid !== undefined
    ? data.paid
      ? `<span style="display:inline-block;background:#f6ffed;border:1px solid #b7eb8f;color:#389e0d;padding:4px 16px;border-radius:20px;font-size:13px;font-weight:600">✓ Пардохт шуд / Оплачено</span>`
      : `<span style="display:inline-block;background:#fff7e6;border:1px solid #ffd591;color:#d46b08;padding:4px 16px;border-radius:20px;font-size:13px;font-weight:600">⏳ Пардохт нашудааст / Не оплачено</span>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="tg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Накладная / Ҳуҷҷат №${data.id}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }

  /* Print bar — hidden when printing */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
    color: #fff; padding: 14px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    box-shadow: 0 2px 16px rgba(22,119,255,0.35);
  }
  .print-bar .title { font-size: 16px; font-weight: 700; }
  .print-bar .hint { font-size: 11px; opacity: 0.85; margin-top: 2px; }
  .print-bar button {
    background: #fff; color: #1677ff; border: none; border-radius: 10px;
    padding: 10px 28px; font-size: 15px; font-weight: 700; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15); white-space: nowrap;
  }
  .print-bar button:active { transform: scale(0.97); }
  .page { padding: 72px 24px 24px; max-width: 800px; margin: 0 auto; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 3px solid #1677ff; }
  .brand { font-size: 24px; font-weight: 900; color: #1677ff; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .inv-number { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-top: 10px; }
  .inv-date { font-size: 12px; color: #6b7280; margin-top: 3px; }

  /* Info boxes */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .info-box { background: #f8faff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 12px 14px; }
  .info-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
  .info-val { font-size: 14px; font-weight: 700; color: #1a1a2e; }

  /* Notes */
  .notes { background: #fffbf0; border: 1px solid #ffd666; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px; }
  thead tr { background: #e8ecf4; }
  th { padding: 9px 8px; border: 1px solid #d0d7e8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  .total-row td { background: #1677ff !important; color: #fff; font-weight: 700; font-size: 14px; padding: 9px 8px; }

  /* Status */
  .status-row { margin-bottom: 14px; }

  /* Signatures */
  .signatures { display: flex; gap: 16px; margin-top: 36px; }
  .sig { flex: 1; text-align: center; }
  .sig-line { border-top: 1.5px solid #555; padding-top: 8px; font-size: 11px; color: #6b7280; }

  /* Footer */
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f0f0f0; padding-top: 10px; }

  @media print {
    .print-bar { display: none !important; }
    .page { padding: 0; max-width: 100%; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .total-row td { background: #1677ff !important; color: #fff !important; }
    thead tr { background: #e8ecf4 !important; }
    .info-box { background: #f8faff !important; }
  }
</style>
</head>
<body>

<!-- Print bar (hidden when printing) -->
<div class="print-bar">
  <div>
    <div class="title">Ҳуҷҷат №${data.id}</div>
    <div class="hint">📱 iOS: Share → Print &nbsp;|&nbsp; Android: кнопку ниже нажмите</div>
  </div>
  <button onclick="window.print()">🖨&nbsp; Чоп / Печать / PDF</button>
</div>

<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">WMS</div>
      <div class="brand-sub">Warehouse Management System</div>
      <div class="inv-number">Накладная / Ҳуҷҷат №${data.id}</div>
      <div class="inv-date">📅 ${dateStr}</div>
    </div>
    <img
      src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qr)}"
      width="100" height="100"
      style="border:3px solid #e0e7ff;border-radius:10px;flex-shrink:0"
      onerror="this.style.display='none'"
    />
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">📍 ${locationKey}</div>
      <div class="info-val">${locationLabel}</div>
    </div>
    <div class="info-box">
      <div class="info-label">👤 Корманд / Сотрудник</div>
      <div class="info-val">${data.userFullname}</div>
    </div>
  </div>

  ${data.notes ? `<div class="notes"><strong>📝 Эзоҳ / Примечание:</strong> ${data.notes}</div>` : ''}

  <!-- Products table -->
  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center">№</th>
        <th style="text-align:left">Мол / Товар</th>
        <th style="width:54px;text-align:center">Миқд.</th>
        <th style="width:96px;text-align:right">Нарх / Цена</th>
        <th style="width:96px;text-align:right">Сумма</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" style="text-align:right;border:1px solid #1261cc">Ҷамъ / Итого:</td>
        <td style="text-align:right;border:1px solid #1261cc">${formatCurrency(grandTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Status -->
  <div class="status-row">${statusBadge}</div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig"><div class="sig-line">Корманд / Сотрудник<br><br>${data.userFullname}</div></div>
    <div class="sig"><div class="sig-line">Имзо / Подпись<br><br>&nbsp;</div></div>
    <div class="sig"><div class="sig-line">Қабул кард / Принял<br><br>&nbsp;</div></div>
  </div>

  <div class="footer">
    WMS &nbsp;•&nbsp; Ҳуҷҷат / Накладная №${data.id} &nbsp;•&nbsp; ${dateStr}
  </div>
</div>

<script>
// Auto-print on non-iOS browsers (iOS blocks window.print() from onload)
(function() {
  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isIOS) {
    window.addEventListener('load', function() {
      setTimeout(function() { try { window.print(); } catch(e) {} }, 400);
    });
  }
})();
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    // Fallback if popup blocked
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
