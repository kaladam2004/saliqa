import React, { useState } from 'react';
import {
  Table, Tag, Select, Button, Card, Row, Col, Badge, Popconfirm, message, Typography,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserPayments } from '../../api/userPayments';
import { acceptUserPayment } from '../../api/userPayments';
import { getUsers } from '../../api/users';
import type { UserPayment, User } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const UserPaymentsAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  const [filterAccepted, setFilterAccepted] = useState<string | undefined>();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['user-payments-admin'],
    queryFn: getUserPayments,
  });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const acceptMutation = useMutation({
    mutationFn: acceptUserPayment,
    onSuccess: () => {
      message.success(t('user_payments.accepted'));
      queryClient.invalidateQueries({ queryKey: ['user-payments-admin'] });
    },
  });

  const filtered = payments.filter((p: UserPayment) => {
    if (filterUserId && p.user.id !== filterUserId) return false;
    if (filterAccepted === 'pending' && p.accepted) return false;
    if (filterAccepted === 'accepted' && !p.accepted) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s: number, p: UserPayment) => s + p.amount, 0);

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('common.date'), dataIndex: 'date', render: formatDateTime, width: 150 },
    {
      title: t('common.sales_rep'), key: 'user',
      render: (_: unknown, r: UserPayment) => r.user.fullname,
    },
    {
      title: t('payments.payment_method'), dataIndex: 'paymentMethod', width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: t('common.amount'), dataIndex: 'amount', width: 130, render: formatCurrency },
    {
      title: t('common.status'), key: 'status', width: 110,
      render: (_: unknown, r: UserPayment) =>
        r.accepted
          ? <Badge status="success" text={t('user_payments.accepted_status')} />
          : <Badge status="warning" text={t('user_payments.pending_status')} />,
    },
    {
      title: t('common.actions'), key: 'actions', width: 90,
      render: (_: unknown, r: UserPayment) =>
        !r.accepted ? (
          <Popconfirm
            title={t('user_payments.confirm_accept')}
            onConfirm={() => acceptMutation.mutate(r.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button size="small" type="primary" icon={<CheckOutlined />}>
              {t('user_payments.accept')}
            </Button>
          </Popconfirm>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(r.acceptedAt)}</Text>
        ),
    },
  ];

  return (
    <>
      <PageHeader title={t('user_payments.page_title')} />
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={7}>
            <Select
              placeholder={t('common.filter_by_user')}
              allowClear style={{ width: '100%' }}
              onChange={(v: number | undefined) => setFilterUserId(v)}
            >
              {users.map((u: User) => (
                <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder={t('common.status')}
              allowClear style={{ width: '100%' }}
              onChange={(v: string | undefined) => setFilterAccepted(v)}
            >
              <Select.Option value="pending">{t('user_payments.pending_status')}</Select.Option>
              <Select.Option value="accepted">{t('user_payments.accepted_status')}</Select.Option>
            </Select>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Text strong>{t('common.total')}: {formatCurrency(totalFiltered)}</Text>
          </Col>
        </Row>
      </Card>
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20 }}
      />
    </>
  );
};

export default UserPaymentsAdminPage;
