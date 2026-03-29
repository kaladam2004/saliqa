import type { PrintInvoiceData } from '../components/common/InvoicePrintModal';
import { buildQrPayload } from '../components/common/InvoicePrintModal';
import { formatCurrency } from './helpers';
import dayjs from 'dayjs';

/* ─── Shared HTML generator (used by both popup and PDF) ─── */
// qrSrc: pass a data URL for PDF (avoids CORS), or leave undefined for popup (uses external URL)
function buildInvoiceHTML(data: PrintInvoiceData, qrSrc?: string): string {
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

  const externalQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qr)}`;
  const qrImg = (qrSrc || externalQrSrc)
    ? `<img src="${qrSrc || externalQrSrc}" width="100" height="100" ${!qrSrc ? 'crossorigin="anonymous"' : ''} style="border:3px solid #e0e7ff;border-radius:10px;display:block" />`
    : '';

  return `
<div style="font-family:Arial,'Helvetica Neue',sans-serif;font-size:13px;color:#1a1a2e;background:#fff;padding:24px 28px;max-width:760px">

  <!-- Header — table layout for html2canvas compatibility -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;padding-bottom:14px;border-bottom:3px solid #1677ff">
    <tbody><tr>
      <td style="vertical-align:top;padding-bottom:14px">
        <div style="font-size:24px;font-weight:900;color:#1677ff;letter-spacing:-0.5px">WMS</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">Warehouse Management System</div>
        <div style="font-size:20px;font-weight:700;color:#1a1a2e;margin-top:10px">Накладная / Ҳуҷҷат №${data.id}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px">${dateStr}</div>
      </td>
      <td style="vertical-align:top;text-align:right;width:110px;padding-bottom:14px">${qrImg}</td>
    </tr></tbody>
  </table>

  <!-- Info — table layout instead of grid -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tbody><tr>
      <td style="width:50%;padding-right:8px;vertical-align:top">
        <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;padding:12px 14px">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">${locationKey}</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a2e">${locationLabel}</div>
        </div>
      </td>
      <td style="width:50%;padding-left:8px;vertical-align:top">
        <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;padding:12px 14px">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">Корманд / Сотрудник</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a2e">${data.userFullname}</div>
        </div>
      </td>
    </tr></tbody>
  </table>

  ${data.notes ? `<div style="background:#fffbf0;border:1px solid #ffd666;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px"><strong>Эзоҳ / Примечание:</strong> ${data.notes}</div>` : ''}

  <!-- Products table -->
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px">
    <thead>
      <tr style="background:#e8ecf4">
        <th style="width:36px;text-align:center;padding:9px 8px;border:1px solid #d0d7e8;font-size:11px;font-weight:700">№</th>
        <th style="text-align:left;padding:9px 8px;border:1px solid #d0d7e8;font-size:11px;font-weight:700">Мол / Товар</th>
        <th style="width:54px;text-align:center;padding:9px 8px;border:1px solid #d0d7e8;font-size:11px;font-weight:700">Миқд.</th>
        <th style="width:96px;text-align:right;padding:9px 8px;border:1px solid #d0d7e8;font-size:11px;font-weight:700">Нарх / Цена</th>
        <th style="width:96px;text-align:right;padding:9px 8px;border:1px solid #d0d7e8;font-size:11px;font-weight:700">Сумма</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right;border:1px solid #1261cc;background:#1677ff;color:#fff;font-weight:700;font-size:14px;padding:9px 8px">Ҷамъ / Итого:</td>
        <td style="text-align:right;border:1px solid #1261cc;background:#1677ff;color:#fff;font-weight:700;font-size:14px;padding:9px 8px">${formatCurrency(grandTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Status -->
  <div style="margin-bottom:14px">${statusBadge}</div>

  <!-- Signatures — table layout -->
  <table style="width:100%;border-collapse:collapse;margin-top:36px">
    <tbody><tr>
      <td style="text-align:center;padding-top:8px;border-top:1.5px solid #555;font-size:11px;color:#6b7280">
        Корманд / Сотрудник<br><br>${data.userFullname}
      </td>
      <td style="text-align:center;padding-top:8px;border-top:1.5px solid #555;font-size:11px;color:#6b7280;padding-left:16px;padding-right:16px">
        Имзо / Подпись<br><br>&nbsp;
      </td>
      <td style="text-align:center;padding-top:8px;border-top:1.5px solid #555;font-size:11px;color:#6b7280">
        Қабул кард / Принял<br><br>&nbsp;
      </td>
    </tr></tbody>
  </table>

  <div style="margin-top:24px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #f0f0f0;padding-top:10px">
    WMS &nbsp;•&nbsp; Ҳуҷҷат / Накладная №${data.id} &nbsp;•&nbsp; ${dateStr}
  </div>
</div>`;
}

/* ─── Pre-fetch image as inline data URL (avoids html2canvas CORS issues) ─── */
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ─── Auto PDF download (works on Windows, Mac, Android) ─── */
export async function downloadInvoicePDF(data: PrintInvoiceData): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Pre-fetch QR as inline data URL so html2canvas has no CORS issues
  const qr = buildQrPayload(data);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qr)}`;
  const qrDataUrl = await fetchAsDataUrl(qrUrl);

  const container = document.createElement('div');
  container.style.cssText =
    'position:absolute;top:-99999px;left:0;width:794px;background:#fff;';
  container.innerHTML = buildInvoiceHTML(data, qrDataUrl ?? undefined);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      height: container.scrollHeight,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
    } else {
      // Multi-page support
      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, pageW, imgH);
        yOffset += pageH;
      }
    }

    pdf.save(`Invoice-${data.id}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/* ─── Mobile popup print (fallback for iOS) ─── */
export function mobilePrintInvoice(data: PrintInvoiceData): void {
  const html = `<!DOCTYPE html>
<html lang="tg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Накладная / Ҳуҷҷат №${data.id}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; }
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
    white-space: nowrap;
  }
  .page { padding: 72px 24px 24px; max-width: 800px; margin: 0 auto; }
  @media print {
    .print-bar { display: none !important; }
    .page { padding: 0; max-width: 100%; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
<div class="print-bar">
  <div>
    <div class="title">Ҳуҷҷат №${data.id}</div>
    <div class="hint">iOS: Share → Print &nbsp;|&nbsp; Android: кнопку ниже</div>
  </div>
  <button onclick="window.print()">🖨 Чоп / PDF</button>
</div>
<div class="page">${buildInvoiceHTML(data)}</div>
<script>
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
