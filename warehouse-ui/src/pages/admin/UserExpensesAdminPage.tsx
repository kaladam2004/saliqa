import React, { useState } from 'react';
import { Table, Button, Tag, Space, Typography, message, Tooltip, Select, Card, Row, Col, DatePicker, Statistic } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filterExpenses, approveExpense } from '../../api/expenses';
import { getUsers } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import type { Expense } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title } = Typography;

const UserExpensesAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<number | undefined>();
  const [dateFilter, setDateFilter] = useState<{ from?: string; to?: string }>({});

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['user-expenses-admin', userId, dateFilter],
    queryFn: () => filterExpenses({ userId, ...dateFilter }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveExpense(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-expenses-admin'] });
      message.success(t('expenses.approved'));
    },
    onError: () => message.error(t('common.error')),
  });

  const setToday = () => setDateFilter({
    from: dayjs().startOf('day').toISOString(),
    to: dayjs().endOf('day').toISOString(),
  });

  const columns = [
    {
      title: t('common.sales_rep'), key: 'user',
      render: (_: unknown, r: Expense) => r.userFullname ?? '-',
    },
    { title: t('common.date'), dataIndex: 'date', key: 'date', render: (v: string) => formatDate(v) },
    { title: t('common.description'), dataIndex: 'description', key: 'description' },
    {
      title: t('expenses.category'), dataIndex: 'category', key: 'category',
      render: (v?: string) => v ? <Tag>{t(`expenses.categories.${v}`, v)}</Tag> : '-',
    },
    { title: t('common.amount'), dataIndex: 'total', key: 'total', render: (v: number) => formatCurrency(v) },
    {
      title: t('common.status'), key: 'status',
      render: (_: unknown, r: Expense) => r.approved
        ? <Tag color="green">{t('expenses.approved_label')}</Tag>
        : <Tag color="orange">{t('expenses.pending_label')}</Tag>,
    },
    {
      title: t('common.actions'), key: 'actions',
      render: (_: unknown, r: Expense) => !r.approved && (
        <Tooltip title={t('expenses.approve')}>
          <Button
            icon={<CheckOutlined />}
            type="primary"
            size="small"
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate(r.id)}
          />
        </Tooltip>
      ),
    },
  ];

  const total = expenses.reduce((s, e) => s + e.total, 0);
  const pending = expenses.filter(e => !e.approved).length;

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }} wrap>
        <Title level={4} style={{ margin: 0 }}>
          {t('expenses.user_expenses_title')}
        </Title>
      </Space>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder={t('common.filter_by_user')} allowClear style={{ width: '100%' }}
              onChange={v => setUserId(v)}
            >
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <DatePicker
              placeholder={t('common.from')} style={{ width: '100%' }}
              onChange={v => setDateFilter(f => ({ ...f, from: v ? dayjs(v).startOf('day').toISOString() : undefined }))}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <DatePicker
              placeholder={t('common.to')} style={{ width: '100%' }}
              onChange={v => setDateFilter(f => ({ ...f, to: v ? dayjs(v).endOf('day').toISOString() : undefined }))}
            />
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Button block onClick={setToday}>{t('common.today')}</Button>
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Button block onClick={() => { setDateFilter({}); setUserId(undefined); }}>{t('common.all')}</Button>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Space>
              <Statistic
                title={t('expenses.pending_count', { count: pending })}
                value={formatCurrency(total)}
                valueStyle={{ fontSize: 16 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

export default UserExpensesAdminPage;
