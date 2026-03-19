import React, { useState } from 'react';
import { Table, Button, Space, Tag, DatePicker, Select, Row, Col, Card, message, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoices, filterInvoices, deleteInvoice } from '../../api/invoices';
import { getShops } from '../../api/shops';
import { getUsers } from '../../api/users';
import type { Invoice, InvoiceFilter } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import InvoicePrintModal, { type PrintInvoiceData } from '../../components/common/InvoicePrintModal';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const InvoicesPage: React.FC = () => {
  const [filter, setFilter] = useState<InvoiceFilter>({});
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', filter],
    queryFn: () => Object.keys(filter).length > 0 ? filterInvoices(filter) : getInvoices(),
  });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); message.success(t('invoices.invoice_deleted')); },
  });

  const openPrint = (inv: Invoice) => {
    setPrintData({
      id: inv.id,
      type: 'inv',
      date: inv.date,
      shopId: inv.shop?.id,
      shopTitle: inv.shop?.title,
      userId: inv.user?.id ?? 0,
      userFullname: inv.user?.fullname ?? '',
      totalPrice: Number(inv.totalPrice),
      paid: inv.paid,
      notes: inv.notes,
      products: (inv.products ?? []).map(p => ({
        productName: p.productName,
        quantity: p.quantity,
        unitPrice: Number(p.unitPrice),
        totalPrice: Number(p.totalPrice),
      })),
    });
  };

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('common.date'), dataIndex: 'date', render: formatDateTime },
    { title: t('common.shop'), key: 'shop', render: (_: unknown, r: Invoice) => r.shop?.title },
    { title: t('common.sales_rep'), key: 'user', render: (_: unknown, r: Invoice) => r.user?.fullname },
    { title: t('common.total'), dataIndex: 'totalPrice', render: (v: number) => formatCurrency(v) },
    {
      title: t('common.status'), key: 'status',
      render: (_: unknown, r: Invoice) => (
        <Space>
          <Tag color={r.paid ? 'green' : 'orange'}>{r.paid ? t('common.paid') : t('common.unpaid')}</Tag>
          {r.free && <Tag color="blue">{t('common.free')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('invoices.printed'), key: 'printed', width: 110,
      render: (_: unknown, r: Invoice) =>
        r.printed
          ? <Tag color="green">{t('invoices.printed')}</Tag>
          : <Tag color="default">{t('invoices.not_printed')}</Tag>,
    },
    {
      title: t('common.actions'), key: 'actions', width: 140,
      render: (_: unknown, r: Invoice) => (
        <Space>
          <Button size="small" onClick={() => { setSelected(r); setDetailModal(true); }}>{t('common.view')}</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => openPrint(r)} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('invoices.page_title')} />
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={5}>
            <Select placeholder={t('common.filter_by_shop')} allowClear style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, shopId: v }))}>
              {shops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select placeholder={t('common.filter_by_user')} allowClear style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, userId: v }))}>
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <DatePicker placeholder={t('common.from')} style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, from: v ? dayjs(v).toISOString() : undefined }))} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <DatePicker placeholder={t('common.to')} style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, to: v ? dayjs(v).toISOString() : undefined }))} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button onClick={() => setFilter(f => ({ ...f, from: dayjs().startOf('day').toISOString(), to: dayjs().endOf('day').toISOString() }))}>
              {t('common.today')}
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => setFilter({})}>{t('common.all')}</Button>
          </Col>
        </Row>
      </Card>
      <Table dataSource={invoices} columns={columns} rowKey="id" loading={isLoading} scroll={{ x: 800 }} />

      {/* Detail Modal */}
      <Modal
        title={t('invoices.invoice_details')}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        width={700}
        footer={
          selected && (
            <Space>
              <Button onClick={() => setDetailModal(false)}>{t('common.close')}</Button>
              <Button type="primary" icon={<PrinterOutlined />} onClick={() => { openPrint(selected); setDetailModal(false); }}>
                {t('invoices.print')}
              </Button>
            </Space>
          )
        }
      >
        {selected && (
          <>
            <p><b>{t('common.shop')}:</b> {selected.shop?.title}</p>
            <p><b>{t('common.sales_rep')}:</b> {selected.user?.fullname}</p>
            <p><b>{t('common.date')}:</b> {formatDateTime(selected.date)}</p>
            <p><b>{t('common.total')}:</b> {formatCurrency(selected.totalPrice)}</p>
            <p><b>{t('common.status')}:</b> <Tag color={selected.paid ? 'green' : 'orange'}>{selected.paid ? t('common.paid') : t('common.unpaid')}</Tag></p>
            <Table size="small" dataSource={selected.products} rowKey="id" pagination={false}
              columns={[
                { title: t('common.product'), dataIndex: 'productName' },
                { title: t('common.qty'), dataIndex: 'quantity' },
                { title: t('common.unit_price'), dataIndex: 'unitPrice', render: formatCurrency },
                { title: t('common.total'), dataIndex: 'totalPrice', render: formatCurrency },
              ]} />
          </>
        )}
      </Modal>

      {/* Print Modal */}
      <InvoicePrintModal
        open={!!printData}
        data={printData}
        onClose={() => setPrintData(null)}
      />
    </>
  );
};

export default InvoicesPage;
