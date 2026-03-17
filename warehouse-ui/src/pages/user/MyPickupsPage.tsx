import React, { useState } from 'react';
import {
  Table, Tag, Typography, Button, Space, Drawer, Descriptions, Divider, Empty, Badge,
} from 'antd';
import { PlusOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { filterUserInvoices } from '../../api/userInvoices';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import type { UserInvoice } from '../../types';
import InvoicePrintModal, { type PrintInvoiceData } from '../../components/common/InvoicePrintModal';

const { Title, Text } = Typography;

const MyPickupsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<UserInvoice | null>(null);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);

  const { data: pickups = [], isLoading } = useQuery({
    queryKey: ['my-pickups', user?.id],
    queryFn: () => filterUserInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });

  const pickupToPrintData = (r: UserInvoice): PrintInvoiceData => ({
    id: r.id,
    type: 'uinv',
    date: r.date,
    warehouseId: r.warehouse.id,
    warehouseTitle: r.warehouse.title,
    userId: r.user.id,
    userFullname: r.user.fullname,
    totalPrice: r.totalPrice,
    notes: r.notes,
    products: r.products.map(p => ({
      productName: p.productName,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
    })),
  });

  const columns = [
    {
      title: t('common.date'), dataIndex: 'date', key: 'date', width: 160,
      render: (d: string) => formatDateTime(d),
      sorter: (a: UserInvoice, b: UserInvoice) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    { title: t('common.warehouse'), key: 'warehouse', render: (_: unknown, r: UserInvoice) => r.warehouse.title },
    {
      title: t('common.product'), key: 'products',
      render: (_: unknown, r: UserInvoice) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.products.map(p => `${p.productName} ×${p.quantity}`).join(', ')}
        </Text>
      ),
    },
    { title: t('common.total'), dataIndex: 'totalPrice', key: 'total', width: 120, render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
    {
      title: t('common.status'), key: 'status', width: 120,
      render: (_: unknown, r: UserInvoice) => (
        <Space direction="vertical" size={2}>
          {r.paid ? <Badge status="success" text={t('common.paid')} /> : <Badge status="warning" text={t('common.unpaid')} />}
          {r.printed ? <Tag color="green" style={{ fontSize: 11 }}>{t('invoices.printed')}</Tag> : <Tag color="default" style={{ fontSize: 11 }}>{t('invoices.not_printed')}</Tag>}
        </Space>
      ),
    },
    {
      title: '', key: 'action', width: 100,
      render: (_: unknown, r: UserInvoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintData(pickupToPrintData(r))} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('user_invoices.my_pickups_title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/user/user-invoices')}>
          {t('user_invoices.create_pickup')}
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={pickups}
        columns={columns}
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: <Empty description={t('user_invoices.no_pickups')} /> }}
      />

      <Drawer
        title={selected ? `${t('user_invoices.pickup_title')} #${selected.id}` : ''}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t('common.date')}>{formatDateTime(selected.date)}</Descriptions.Item>
              <Descriptions.Item label={t('common.warehouse')}>{selected.warehouse.title}</Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                {selected.paid ? <Tag color="success">{t('common.paid')}</Tag> : <Tag color="warning">{t('common.unpaid')}</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label={t('invoices.printed')}>
                {selected.printed ? <Tag color="green">{t('invoices.printed')}</Tag> : <Tag color="default">{t('invoices.not_printed')}</Tag>}
              </Descriptions.Item>
              {selected.notes && (
                <Descriptions.Item label={t('common.notes')}>{selected.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">{t('menu.products')}</Divider>
            <Table
              rowKey={(_: unknown, i) => String(i)}
              size="small"
              pagination={false}
              dataSource={selected.products}
              columns={[
                { title: t('common.product'), dataIndex: 'productName' },
                { title: t('common.qty'), dataIndex: 'quantity', width: 60 },
                { title: t('common.unit_price'), dataIndex: 'unitPrice', render: formatCurrency, width: 110 },
                { title: t('common.total'), width: 110, render: (_: unknown, r: unknown) => { const p = r as { unitPrice: number; quantity: number }; return formatCurrency(p.unitPrice * p.quantity); } },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                    <Text strong>{t('common.total')}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>{formatCurrency(selected.totalPrice)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            <Divider />
            <Button icon={<PrinterOutlined />} onClick={() => { setPrintData(pickupToPrintData(selected)); setSelected(null); }}>
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
    </>
  );
};

export default MyPickupsPage;
