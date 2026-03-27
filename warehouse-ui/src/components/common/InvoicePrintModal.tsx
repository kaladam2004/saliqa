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


const InvoicePrintModal: React.FC<Props> = ({ open, data, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `Invoice-${data.id}` : 'Invoice',
  });

  if (!data) return null;
  const qr = buildQrPayload(data);

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
            onClick={() => handlePrint()}
          >
            PDF
          </Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>
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
