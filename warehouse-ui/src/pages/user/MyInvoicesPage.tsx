import React, { useState } from 'react';
import {
  Table, Tag, Typography, Button, Space, Drawer, Descriptions, Divider,
  Empty, Badge,
} from 'antd';
import { PlusOutlined, EyeOutlined, PrinterOutlined, ScanOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { filterInvoices, markInvoicePrinted } from '../../api/invoices';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import type { Invoice, InvoiceProductResponse } from '../../types';
import dayjs from 'dayjs';
import InvoicePrintModal, { type PrintInvoiceData } from '../../components/common/InvoicePrintModal';
import QRScannerModal, { type QRVerifyTarget } from '../../components/common/QRScannerModal';

const { Title, Text } = Typography;

const MyInvoicesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);
  const [scanTarget, setScanTarget] = useState<QRVerifyTarget | null>(null);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-invoices', user?.id],
    queryFn: () => filterInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });

  const markPrintedMutation = useMutation({
    mutationFn: markInvoicePrinted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invoices', user?.id] });
      setScanTarget(null);
    },
  });

  const columns = [
    {
      title: t('common.date'),
      dataIndex: 'date',
      key: 'date',
      width: 160,
      render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm'),
      sorter: (a: Invoice, b: Invoice) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: t('common.shop'),
      key: 'shop',
      render: (_: unknown, r: Invoice) => r.shop.title,
    },
    {
      title: t('common.product'),
      key: 'products',
      render: (_: unknown, r: Invoice) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.products.map((p: InvoiceProductResponse) => `${p.productName} ×${p.quantity}`).join(', ')}
        </Text>
      ),
    },
    {
      title: t('common.total'),
      dataIndex: 'totalPrice',
      key: 'total',
      width: 120,
      render: (v: number, r: Invoice) =>
        r.free ? <Tag color="blue">{t('common.free')}</Tag> : <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: t('common.status'),
      key: 'status',
      width: 100,
      render: (_: unknown, r: Invoice) =>
        r.paid
          ? <Badge status="success" text={t('common.paid')} />
          : <Badge status="warning" text={t('common.unpaid')} />,
    },
    {
      title: t('invoices.printed'),
      key: 'printed',
      width: 110,
      render: (_: unknown, r: Invoice) =>
        r.printed
          ? <Tag color="green">{t('invoices.printed')}</Tag>
          : <Tag color="default">{t('invoices.not_printed')}</Tag>,
    },
    {
      title: '',
      key: 'action',
      width: 130,
      render: (_: unknown, r: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintData(invoiceToPrintData(r))} />
          {!r.printed && (
            <Button size="small" icon={<ScanOutlined />} onClick={() => setScanTarget({
              type: 'inv', id: r.id, shopId: r.shop.id, userId: r.user.id, total: r.totalPrice,
            })} />
          )}
        </Space>
      ),
    },
  ];

  const invoiceToPrintData = (r: Invoice): PrintInvoiceData => ({
    id: r.id,
    type: 'inv',
    date: r.date,
    shopId: r.shop.id,
    shopTitle: r.shop.title,
    userId: r.user.id,
    userFullname: r.user.fullname,
    totalPrice: r.totalPrice,
    notes: r.notes,
    products: r.products.map(p => ({
      productName: p.productName,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.totalPrice,
    })),
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('menu.all_invoices')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/user/wizard/sales')}>
          {t('menu.create_invoice')}
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={invoices}
        columns={columns}
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: <Empty description={t('invoices.no_invoices')} /> }}
      />

      <Drawer
        title={selected ? `${t('menu.invoices')} #${selected.id}` : ''}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t('common.date')}>
                {dayjs(selected.date).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label={t('common.shop')}>{selected.shop.title}</Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                {selected.paid
                  ? <Tag color="success">{t('common.paid')}</Tag>
                  : <Tag color="warning">{t('common.unpaid')}</Tag>}
              </Descriptions.Item>
              {selected.free && (
                <Descriptions.Item label={t('invoices.free_invoice')}>
                  <Tag color="blue">{t('common.free')}</Tag>
                </Descriptions.Item>
              )}
              {selected.notes && (
                <Descriptions.Item label={t('common.notes')}>{selected.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">{t('menu.products')}</Divider>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={selected.products}
              columns={[
                { title: t('common.product'), dataIndex: 'productName' },
                { title: t('common.qty'), dataIndex: 'quantity', width: 60 },
                { title: t('common.unit_price'), dataIndex: 'unitPrice', render: formatCurrency, width: 110 },
                { title: t('common.total'), dataIndex: 'totalPrice', render: formatCurrency, width: 110 },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                    <Text strong>{t('common.total')}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>
                      {selected.free ? <Tag color="blue">{t('common.free')}</Tag> : formatCurrency(selected.totalPrice)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            {selected.payments.length > 0 && (
              <>
                <Divider orientation="left">{t('menu.payments')}</Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selected.payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{dayjs(p.paidAt).format('DD.MM.YYYY')}</Text>
                      <Text strong>{formatCurrency(p.amount)}</Text>
                    </div>
                  ))}
                </Space>
              </>
            )}
          <Divider />
          <Button
            icon={<PrinterOutlined />}
            onClick={() => { setPrintData(invoiceToPrintData(selected)); setSelected(null); }}
          >
            {t('invoices.print')}
          </Button>
          </>
        )}
      </Drawer>

      <InvoicePrintModal
        open={!!printData}
        data={printData}
        onClose={() => setPrintData(null)}
      />

      <QRScannerModal
        open={!!scanTarget}
        target={scanTarget}
        onVerified={() => scanTarget && markPrintedMutation.mutate(scanTarget.id)}
        onClose={() => setScanTarget(null)}
      />
    </>
  );
};

export default MyInvoicesPage;
