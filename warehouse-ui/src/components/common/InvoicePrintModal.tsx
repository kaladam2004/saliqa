import React, { useRef } from 'react';
import { Modal, Button, Table, Divider, Typography, Space, Row, Col } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export interface PrintInvoiceData {
  id: number;
  type: 'inv' | 'uinv';
  date: string;
  // For inv
  shopId?: number;
  shopTitle?: string;
  userId: number;
  userFullname: string;
  // For uinv
  warehouseId?: number;
  warehouseTitle?: string;
  totalPrice: number;
  notes?: string;
  products: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
  }>;
}

/** Build a compact, deterministic QR payload for an invoice */
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

const PrintContent = React.forwardRef<HTMLDivElement, { data: PrintInvoiceData; qr: string }>(
  ({ data, qr }, ref) => {
    const { t } = useTranslation();
    const columns = [
      { title: t('common.product'), dataIndex: 'productName' },
      { title: t('common.qty'), dataIndex: 'quantity', width: 70 },
      { title: t('common.unit_price'), dataIndex: 'unitPrice', width: 110, render: (v: number) => formatCurrency(v) },
      {
        title: t('common.total'), width: 110,
        render: (_: unknown, r: { unitPrice: number; quantity: number; totalPrice?: number }) =>
          formatCurrency(r.totalPrice ?? r.unitPrice * r.quantity),
      },
    ];

    return (
      <div ref={ref} style={{ padding: 32, fontFamily: 'Arial, sans-serif', maxWidth: 700, margin: '0 auto' }}>
        <style>{`@media print { body { -webkit-print-color-adjust: exact; } }`}</style>
        <Row justify="space-between" align="top">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              {data.type === 'inv' ? t('invoices.print_invoice') : t('user_invoices.print_invoice')}
              {' '}#{data.id}
            </Title>
            <Text type="secondary">{dayjs(data.date).format('DD.MM.YYYY HH:mm')}</Text>
            <div style={{ marginTop: 12 }}>
              {data.type === 'inv' ? (
                <>
                  <div><Text strong>{t('common.shop')}:</Text> {data.shopTitle}</div>
                  <div><Text strong>{t('common.sales_rep')}:</Text> {data.userFullname}</div>
                </>
              ) : (
                <>
                  <div><Text strong>{t('common.warehouse')}:</Text> {data.warehouseTitle}</div>
                  <div><Text strong>{t('common.sales_rep')}:</Text> {data.userFullname}</div>
                </>
              )}
              {data.notes && <div><Text strong>{t('common.notes')}:</Text> {data.notes}</div>}
            </div>
          </Col>
          <Col>
            <QRCodeSVG value={qr} size={120} />
          </Col>
        </Row>

        <Divider />

        <Table
          dataSource={data.products.map((p, i) => ({ ...p, key: i }))}
          columns={columns}
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3} align="right">
                <Text strong>{t('common.total')}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>{formatCurrency(data.totalPrice)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ borderTop: '1px solid #000', width: 180, paddingTop: 4, textAlign: 'center', fontSize: 12 }}>
            {t('common.sales_rep')}
          </div>
          <div style={{ borderTop: '1px solid #000', width: 180, paddingTop: 4, textAlign: 'center', fontSize: 12 }}>
            {t('common.signature')}
          </div>
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
      width={760}
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.close')}</Button>
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
