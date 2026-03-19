import React, { useState } from 'react';
import { Table, Card, Row, Col, Select, DatePicker, Statistic, Tag, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { filterPayments, getPayments } from '../../api/payments';
import { getShops } from '../../api/shops';
import { getUsers } from '../../api/users';
import type { PaymentFilter } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const PaymentsReportPage: React.FC = () => {
  const [filter, setFilter] = useState<PaymentFilter & { userId?: number }>({});
  const { t } = useTranslation();
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', filter],
    queryFn: () => Object.keys(filter).length > 0 ? filterPayments(filter) : getPayments(),
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('payments.paid_at'), dataIndex: 'paidAt', render: formatDateTime },
    { title: t('common.shop'), dataIndex: 'shopTitle' },
    { title: t('payments.invoice_hash'), dataIndex: 'invoiceId' },
    { title: t('common.amount'), dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
    { title: t('payments.method'), dataIndex: 'paymentMethod', render: (v: string) => <Tag>{v}</Tag> },
    { title: t('common.description'), dataIndex: 'description' },
  ];

  return (
    <>
      <PageHeader title={t('payments.page_title')} />
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select placeholder={t('common.filter_by_shop')} allowClear style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, shopId: v }))}>
              {shops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select placeholder={t('common.filter_by_user')} allowClear style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, userId: v }))}>
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DatePicker placeholder={t('common.from')} style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, from: v ? dayjs(v).toISOString() : undefined }))} />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DatePicker placeholder={t('common.to')} style={{ width: '100%' }}
              onChange={v => setFilter(f => ({ ...f, to: v ? dayjs(v).toISOString() : undefined }))} />
          </Col>
          <Col xs={24} sm={6} md={3}>
            <Button block onClick={() => setFilter(f => ({ ...f, from: dayjs().startOf('day').toISOString(), to: dayjs().endOf('day').toISOString() }))}>
              {t('common.today')}
            </Button>
          </Col>
          <Col xs={24} sm={6} md={2}>
            <Button block onClick={() => setFilter({})}>{t('common.all')}</Button>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Statistic title={t('payments.total_collected')} value={total} formatter={v => formatCurrency(Number(v))} />
          </Col>
        </Row>
      </Card>
      <Table dataSource={payments} columns={columns} rowKey="id" loading={isLoading} scroll={{ x: 700 }} />
    </>
  );
};

export default PaymentsReportPage;
