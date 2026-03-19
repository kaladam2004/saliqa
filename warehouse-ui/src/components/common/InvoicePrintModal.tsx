import React, { useRef } from 'react';
import { Modal, Button, Space } from 'antd';
import { PrinterOutlined, FilePdfOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

export interface PrintInvoiceData {
  id: number;
  type: 'inv' | 'uinv';
  date: string;
  shopId?: number;
  shopTitle?: string;
  userId: number;
  userFullname: string;
  warehouseId?: number;
  warehouseTitle?: string;
  totalPrice: number;
  notes?: string;
  paid?: boolean;
  products: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
  }>;
}

export function buildQrPayload(data: PrintInvoiceData): string {
  if (data.type === 'inv') {
    return JSON.stringify({ t: 'inv', id: data.id, si: data.shopId, ui: data.userId, tot: data.totalPrice.toFixed(2) });
  }
  return JSON.stringify({ t: 'uinv', id: data.id, wi: data.warehouseId, ui: data.userId, tot: data.totalPrice.toFixed(2) });
}

interface Props {
  open: boolean;
  data: PrintInvoiceData | null;
  onClose: () => void;
}

const A4_PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 15mm 15mm;
  }
  @media print {
    html, body {
      width: 210mm;
      height: 297mm;
      font-size: 11pt;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print { display: none !important; }
    .print-page {
      width: 100%;
      max-width: 100%;
      padding: 0;
      margin: 0;
      font-family: Arial, 'DejaVu Sans', sans-serif;
    }
    table { border-collapse: collapse; width: 100%; }
    table th, table td { border: 1px solid #555; padding: 5px 8px; font-size: 10pt; }
    table th { background: #e8ecf4 !important; font-weight: bold; text-align: center; }
    .total-row td { font-weight: bold; background: #f5f7ff !important; }
    .header-table { border: none !important; }
    .header-table td { border: none !important; padding: 0 !important; }
    .signatures { margin-top: 28mm; }
  }
`;

const PrintContent = React.forwardRef<HTMLDivElement, { data: PrintInvoiceData; qr: string }>(
  ({ data, qr }, ref) => {
    const { t } = useTranslation();
    const isInv = data.type === 'inv';
    const dateStr = dayjs(data.date).format('DD.MM.YYYY HH:mm');

    const rows = data.products.map((p, i) => ({
      ...p,
      no: i + 1,
      lineTotal: p.totalPrice ?? p.unitPrice * p.quantity,
    }));

    const grandTotal = rows.reduce((s, r) => s + r.lineTotal, 0);

    return (
      <div ref={ref} className="print-page" style={{
        padding: '24px 28px',
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
        color: '#1a1a2e',
        maxWidth: 740,
        margin: '0 auto',
        background: '#fff',
      }}>
        <style>{A4_PRINT_CSS}</style>

        {/* Header */}
        <table className="header-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', width: '65%' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1677ff', letterSpacing: -0.5 }}>
                  WMS — Warehouse
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {t('layout.title')}
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
                    {isInv ? t('invoices.print_invoice') : t('user_invoices.print_invoice')} №{data.id}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{dateStr}</div>
                </div>
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'right', width: '35%' }}>
                <QRCodeSVG value={qr} size={110} />
                <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                  {isInv ? 'INV' : 'UINV'}-{data.id}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Divider */}
        <div style={{ borderTop: '2px solid #1677ff', marginBottom: 14 }} />

        {/* Info block */}
        <table className="header-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 20 }}>
                <div style={{ background: '#f5f7ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8ecf4' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    {isInv ? t('common.shop') : t('common.warehouse')}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                    {isInv ? (data.shopTitle ?? '—') : (data.warehouseTitle ?? '—')}
                  </div>
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ background: '#f5f7ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8ecf4' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    {t('common.sales_rep')}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                    {data.userFullname}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Notes */}
        {data.notes && (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: '#fffbf0', border: '1px solid #ffd666', borderRadius: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>{t('common.notes')}: </span>{data.notes}
          </div>
        )}

        {/* Products table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #d0d5e8', padding: '7px 8px', background: '#e8ecf4', textAlign: 'center', width: 36 }}>№</th>
              <th style={{ border: '1px solid #d0d5e8', padding: '7px 8px', background: '#e8ecf4', textAlign: 'left' }}>
                {t('common.product')}
              </th>
              <th style={{ border: '1px solid #d0d5e8', padding: '7px 8px', background: '#e8ecf4', textAlign: 'center', width: 72 }}>
                {t('common.qty')}
              </th>
              <th style={{ border: '1px solid #d0d5e8', padding: '7px 8px', background: '#e8ecf4', textAlign: 'right', width: 110 }}>
                {t('common.unit_price')}
              </th>
              <th style={{ border: '1px solid #d0d5e8', padding: '7px 8px', background: '#e8ecf4', textAlign: 'right', width: 110 }}>
                {t('common.total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ border: '1px solid #d0d5e8', padding: '6px 8px', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>{r.no}</td>
                <td style={{ border: '1px solid #d0d5e8', padding: '6px 8px', fontWeight: 500 }}>{r.productName}</td>
                <td style={{ border: '1px solid #d0d5e8', padding: '6px 8px', textAlign: 'center' }}>{r.quantity}</td>
                <td style={{ border: '1px solid #d0d5e8', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(r.unitPrice)}</td>
                <td style={{ border: '1px solid #d0d5e8', padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.lineTotal)}</td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="total-row" style={{ background: '#e8f4ff' }}>
              <td colSpan={4} style={{ border: '1px solid #d0d5e8', padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                {t('common.total')}
              </td>
              <td style={{ border: '1px solid #d0d5e8', padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#1677ff' }}>
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Status badge */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', borderRadius: 20,
            background: data.paid ? '#f0fff4' : '#fff7e6',
            border: `1px solid ${data.paid ? '#52c41a' : '#fa8c16'}`,
            fontSize: 12, fontWeight: 600,
            color: data.paid ? '#52c41a' : '#fa8c16',
          }}>
            {data.paid ? '✓ ' + t('common.paid') : '⏳ ' + t('common.unpaid')}
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{dateStr}</span>
        </div>

        {/* Signature lines */}
        <div className="signatures" style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #555', paddingTop: 6, fontSize: 11, color: '#374151' }}>
              {t('common.sales_rep')}: {data.userFullname}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #555', paddingTop: 6, fontSize: 11, color: '#374151' }}>
              {t('common.signature')}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #555', paddingTop: 6, fontSize: 11, color: '#374151' }}>
              {t('invoices.received_by')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, borderTop: '1px solid #e8ecf4', paddingTop: 10, textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>
          WMS · {isInv ? `${t('common.shop')}: ${data.shopTitle}` : `${t('common.warehouse')}: ${data.warehouseTitle}`} · #{data.id} · {dateStr}
        </div>
      </div>
    );
  }
);
PrintContent.displayName = 'PrintContent';

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

function mobilePrint(data: PrintInvoiceData) {
  const qr = buildQrPayload(data);
  const rows = data.products.map((p, i) => {
    const lineTotal = p.totalPrice ?? p.unitPrice * p.quantity;
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8faff'}">
      <td style="padding:7px 8px;border:1px solid #e8ecf4">${i + 1}</td>
      <td style="padding:7px 8px;border:1px solid #e8ecf4">${p.productName}</td>
      <td style="padding:7px 8px;border:1px solid #e8ecf4;text-align:center">${p.quantity}</td>
      <td style="padding:7px 8px;border:1px solid #e8ecf4;text-align:right">${formatCurrency(p.unitPrice)}</td>
      <td style="padding:7px 8px;border:1px solid #e8ecf4;text-align:right;font-weight:600">${formatCurrency(lineTotal)}</td>
    </tr>`;
  }).join('');
  const grandTotal = data.products.reduce((s, p) => s + (p.totalPrice ?? p.unitPrice * p.quantity), 0);
  const dateStr = dayjs(data.date).format('DD.MM.YYYY HH:mm');
  const locationLabel = data.shopTitle ?? data.warehouseTitle ?? '—';
  const statusBadge = data.paid
    ? `<span style="background:#f6ffed;border:1px solid #b7eb8f;color:#389e0d;padding:3px 12px;border-radius:12px;font-size:12px">✓ Оплачено</span>`
    : `<span style="background:#fff7e6;border:1px solid #ffd591;color:#d46b08;padding:3px 12px;border-radius:12px;font-size:12px">⏳ Не оплачено</span>`;
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Накладная #${data.id}</title>
<style>
  @page{size:A4 portrait;margin:12mm 15mm 15mm 15mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;padding:20px}
  @media print{.no-print{display:none!important}body{padding:0}}
  .print-bar{background:#1677ff;color:#fff;padding:12px 20px;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
  .print-bar button{background:#fff;color:#1677ff;border:none;border-radius:8px;padding:8px 22px;font-size:14px;font-weight:700;cursor:pointer}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #1677ff}
  .brand{font-size:22px;font-weight:900;color:#1677ff}
  .inv-num{font-size:18px;font-weight:700}
  .inv-date{color:#6b7280;font-size:12px;margin-top:2px}
  .info-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .info-box{background:#f8faff;border:1px solid #e8ecf4;border-radius:8px;padding:10px 12px}
  .info-label{color:#6b7280;font-size:11px;text-transform:uppercase;margin-bottom:4px}
  .info-val{font-size:13px;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
  thead tr{background:#e8ecf4}
  th{padding:8px;border:1px solid #d0d7e8;font-size:11px;font-weight:700;text-transform:uppercase}
  .total-row td{background:#1677ff!important;color:#fff;font-weight:700;font-size:13px;padding:8px}
  .sigs{display:flex;justify-content:space-between;margin-top:32px;gap:20px}
  .sig{flex:1;border-top:1px solid #666;padding-top:6px;font-size:11px;color:#6b7280;text-align:center}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #f0f0f0;padding-top:10px}
</style></head><body>
<div class="no-print print-bar">
  <div>
    <div style="font-weight:700;font-size:15px">Накладная #${data.id}</div>
    <div style="font-size:11px;opacity:.85">iOS: Share → Print &nbsp;|&nbsp; Android: нажмите "Печать"</div>
  </div>
  <button onclick="window.print()">🖨 Печать / PDF</button>
</div>
<div class="header">
  <div>
    <div class="brand">WMS</div>
    <div class="inv-num">Накладная №${data.id}</div>
    <div class="inv-date">${dateStr}</div>
  </div>
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qr)}" width="90" height="90" style="border:3px solid #e8ecf4;border-radius:8px"/>
</div>
<div class="info-row">
  <div class="info-box"><div class="info-label">📍 ${data.shopTitle ? 'Магазин' : 'Склад'}</div><div class="info-val">${locationLabel}</div></div>
  <div class="info-box"><div class="info-label">👤 Сотрудник</div><div class="info-val">${data.userFullname}</div></div>
</div>
<table>
  <thead><tr>
    <th style="width:32px">№</th><th>Товар</th>
    <th style="width:50px;text-align:center">Кол.</th>
    <th style="width:90px;text-align:right">Цена</th>
    <th style="width:90px;text-align:right">Сумма</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="total-row">
    <td colspan="4" style="text-align:right;border:1px solid #1261cc">Итого:</td>
    <td style="text-align:right;border:1px solid #1261cc">${formatCurrency(grandTotal)}</td>
  </tr></tfoot>
</table>
<div style="margin-bottom:12px">${statusBadge}${data.notes ? `&nbsp;&nbsp;<span style="color:#6b7280;font-size:12px">${data.notes}</span>` : ''}</div>
<div class="sigs">
  <div class="sig">Сотрудник<br><br>____________________</div>
  <div class="sig">Подпись<br><br>____________________</div>
  <div class="sig">Принял<br><br>____________________</div>
</div>
<div class="footer">WMS • Накладная #${data.id} • ${dateStr}</div>
<script>window.onload=function(){try{window.print();}catch(e){}}</script>
</body></html>`;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

const InvoicePrintModal: React.FC<Props> = ({ open, data, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `Invoice-${data.id}` : 'Invoice',
    pageStyle: A4_PRINT_CSS,
  });

  if (!data) return null;
  const qr = buildQrPayload(data);

  const handlePrintClick = () => {
    if (isMobile()) {
      mobilePrint(data);
    } else {
      handlePrint();
    }
  };

  return (
    <Modal
      open={open}
      title={`${t('invoices.print_invoice')} #${data.id}`}
      onCancel={onClose}
      width={800}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '12px 0' } }}
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.close')}</Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handlePrintClick}
          >
            PDF
          </Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrintClick}>
            {t('invoices.print')}
          </Button>
        </Space>
      }
    >
      <PrintContent ref={printRef} data={data} qr={qr} />
    </Modal>
  );
};

export default InvoicePrintModal;
