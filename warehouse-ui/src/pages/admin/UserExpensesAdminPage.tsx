import React from 'react';
import { Table, Button, Tag, Space, Typography, message, Tooltip } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingUserExpenses, approveExpense } from '../../api/expenses';
import { useAuthStore } from '../../store/authStore';
import type { Expense } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

const UserExpensesAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['pending-user-expenses'],
    queryFn: getPendingUserExpenses,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveExpense(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-user-expenses'] });
      message.success(t('expenses.approved'));
    },
    onError: () => message.error(t('common.error')),
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

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>
          {t('expenses.user_expenses_title')} — {t('expenses.pending_count', { count: expenses.length })} — {formatCurrency(total)}
        </Title>
      </Space>
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
