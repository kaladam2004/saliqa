import React from 'react';
import { Table, Tag, Typography, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getPaymentsByUser } from '../../api/payments';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import type { Payment } from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;

const UserShopPaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['shop-payments-by-user', user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user?.id,
  });

  const columns = [
    {
      title: t('common.date'),
      dataIndex: 'paidAt',
      key: 'date',
      width: 160,
      render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm'),
      sorter: (a: Payment, b: Payment) => dayjs(a.paidAt).unix() - dayjs(b.paidAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: t('common.shop'),
      dataIndex: 'shopTitle',
      key: 'shop',
    },
    {
      title: t('common.invoice'),
      dataIndex: 'invoiceId',
      key: 'invoice',
      render: (id: number) => `#${id}`,
      width: 90,
    },
    {
      title: t('payments.payment_method'),
      dataIndex: 'paymentMethod',
      key: 'method',
      width: 130,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t('common.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (v: number) => formatCurrency(v),
    },
  ];

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <Title level={4}>{t('payments.shop_payments_title')}</Title>
      <Table
        rowKey="id"
        dataSource={payments}
        columns={columns}
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: <Empty description={t('payments.no_payments')} /> }}
        summary={() => payments.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4} align="right">
              <Typography.Text strong>{t('payments.total_collected')}</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <Typography.Text strong>{formatCurrency(total)}</Typography.Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        ) : null}
      />
    </>
  );
};

export default UserShopPaymentsPage;
