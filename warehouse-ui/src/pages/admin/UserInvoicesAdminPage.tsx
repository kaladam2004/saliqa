import React, { useState } from 'react';
import { Table, Modal, Card, Row, Col, Select, DatePicker, Tag, Button, Divider, Space, Typography, Statistic, message } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filterUserInvoices, getUserInvoices, markUserInvoicePrinted } from '../../api/userInvoices';
import { getUsers } from '../../api/users';
import { getWarehouses } from '../../api/warehouses';
import type { UserInvoice } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import QRScannerModal, { type QRVerifyTarget } from '../../components/common/QRScannerModal';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const UserInvoicesAdminPage: React.FC = () => {
  const [filter, setFilter] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<UserInvoice | null>(null);
  const [scanTarget, setScanTarget] = useState<QRVerifyTarget | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['user-invoices', filter],
    queryFn: () => Object.keys(filter).length > 0 ? filterUserInvoices(filter) : getUserInvoices(),
  });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });

  const markPrintedMutation = useMutation({
    mutationFn: markUserInvoicePrinted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-invoices'] });
      message.success(t('invoices.qr_match'));
      setScanTarget(null);
    },
    onError: () => message.error(t('common.error')),
  });

  const openScanner = (r: UserInvoice) => {
    setScanTarget({
      type: 'uinv',
      id: r.id,
      warehouseId: r.warehouse?.id,
      userId: r.user?.id,
      total: r.totalPrice,
    });
  };

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('common.date'), dataIndex: 'date', render: formatDateTime },
    { title: t('common.warehouse'), key: 'warehouse', render: (_: unknown, r: UserInvoice) => r.warehouse?.title },
    { title: t('common.sales_rep'), key: 'user', render: (_: unknown, r: UserInvoice) => r.user?.fullname },
    { title: t('common.total'), dataIndex: 'totalPrice', render: (v: number) => formatCurrency(v) },
    { title: t('common.status'), dataIndex: 'paid', render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? t('common.paid') : t('common.unpaid')}</Tag> },
    {
      title: t('invoices.printed'), key: 'printed', width: 110,
      render: (_: unknown, r: UserInvoice) =>
        r.printed
          ? <Tag color="green">{t('invoices.printed')}</Tag>
          : <Tag color="default">{t('invoices.not_printed')}</Tag>,
    },
    {
      title: t('common.actions'), key: 'actions', width: 160,
      render: (_: unknown, r: UserInvoice) => (
        <Space>
          <Button size="small" onClick={() => setDetail(r)}>{t('common.view')}</Button>
          {!r.printed && (
            <Button size="small" icon={<ScanOutlined />} onClick={() => openScanner(r)}>
              {t('invoices.scan_qr')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('user_invoices.page_title')} />
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Select placeholder={t('common.filter_by_user')} allowClear style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, userId: v }))}>
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>)}
            </Select>
          </Col>
          <Col span={6}>
            <Select placeholder={t('common.filter_by_warehouse')} allowClear style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, warehouseId: v }))}>
              {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
            </Select>
          </Col>
          <Col span={6}>
            <DatePicker placeholder={t('common.from')} style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, from: v ? dayjs(v).toISOString() : undefined }))} />
          </Col>
          <Col span={6}>
            <DatePicker placeholder={t('common.to')} style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, to: v ? dayjs(v).toISOString() : undefined }))} />
          </Col>
        </Row>
      </Card>
      <Table dataSource={invoices} columns={columns} rowKey="id" loading={isLoading} />

      <Modal title={t('user_invoices.user_invoice_details')} open={!!detail} onCancel={() => setDetail(null)} footer={null} width={640}>
        {detail && (() => {
          const totalPaid = detail.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
          const remaining = Math.max(0, (detail.totalPrice ?? 0) - totalPaid);
          return (
            <>
              <p><b>{t('common.warehouse')}:</b> {detail.warehouse?.title}</p>
              <p><b>{t('common.sales_rep')}:</b> {detail.user?.fullname}</p>
              <p><b>{t('common.date')}:</b> {formatDateTime(detail.date)}</p>
              <p>
                <b>{t('invoices.printed')}:</b>{' '}
                {detail.printed
                  ? <Tag color="green">{t('invoices.printed')}</Tag>
                  : <Tag>{t('invoices.not_printed')}</Tag>}
              </p>

              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic title={t('common.total')} value={formatCurrency(detail.totalPrice)} valueStyle={{ fontSize: 14 }} />
                </Col>
                <Col span={8}>
                  <Statistic title={t('common.total_paid')} value={formatCurrency(totalPaid)} valueStyle={{ fontSize: 14, color: '#52c41a' }} />
                </Col>
                <Col span={8}>
                  <Statistic title={t('wizards.collect_payment.remaining')} value={formatCurrency(remaining)}
                    valueStyle={{ fontSize: 14, color: remaining > 0 ? '#cf1322' : '#52c41a' }} />
                </Col>
              </Row>

              <Divider orientation="left">{t('menu.products')}</Divider>
              <Table size="small" dataSource={detail.products} rowKey="productId"
                pagination={false}
                columns={[
                  { title: t('common.product'), dataIndex: 'productName' },
                  { title: t('common.qty'), dataIndex: 'quantity', width: 70 },
                  { title: t('common.unit_price'), dataIndex: 'unitPrice', render: formatCurrency, width: 120 },
                ]} />

              {detail.payments?.length > 0 && (
                <>
                  <Divider orientation="left">{t('menu.payments')}</Divider>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {detail.payments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">{dayjs(p.date).format('DD.MM.YYYY')}</Text>
                        <Tag>{p.paymentMethod}</Tag>
                        <Text strong>{formatCurrency(p.amount)}</Text>
                      </div>
                    ))}
                  </Space>
                </>
              )}
            </>
          );
        })()}
      </Modal>

      <QRScannerModal
        open={!!scanTarget}
        target={scanTarget}
        onVerified={() => scanTarget && markPrintedMutation.mutate(scanTarget.id)}
        onClose={() => setScanTarget(null)}
      />
    </>
  );
};

export default UserInvoicesAdminPage;
