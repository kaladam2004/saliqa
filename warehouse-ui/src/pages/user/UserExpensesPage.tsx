import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, InputNumber, DatePicker, Typography,
  Tag, Space, Popconfirm, message, AutoComplete, Select, Alert, Input,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpensesByUser, createExpense, deleteExpense } from '../../api/expenses';
import { useAuthStore } from '../../store/authStore';
import { useExpenseTemplates } from '../../hooks/useExpenseTemplates';
import type { Expense } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title } = Typography;

const CATEGORIES = ['salary', 'fuel', 'ingredients', 'utilities', 'other'];

const UserExpensesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const { templates, saveTemplate } = useExpenseTemplates();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['user-expenses', user?.id],
    queryFn: () => getExpensesByUser(user!.id),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-expenses', user?.id] });
      message.success(t('expenses.submitted'));
      setOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-expenses', user?.id] });
      message.success(t('expenses.deleted'));
    },
  });

  const handleSubmit = (values: { description: string; date: dayjs.Dayjs; total: number; category?: string }) => {
    saveTemplate(values.description);
    createMutation.mutate({
      userId: user!.id,
      description: values.description,
      date: values.date.format('YYYY-MM-DD'),
      total: values.total,
      category: values.category,
    });
  };

  const columns = [
    {
      title: t('common.date'), dataIndex: 'date', key: 'date',
      render: (v: string) => formatDate(v),
      sorter: (a: Expense, b: Expense) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend' as const,
    },
    { title: t('common.description'), dataIndex: 'description', key: 'description' },
    {
      title: t('expenses.category'), dataIndex: 'category', key: 'category',
      render: (v?: string) => v ? <Tag>{t(`expenses.categories.${v}`, v)}</Tag> : '-',
    },
    { title: t('common.amount'), dataIndex: 'total', key: 'total', render: (v: number) => formatCurrency(v) },
    {
      title: t('common.status'), key: 'status',
      render: (_: unknown, r: Expense) => r.approved
        ? (
          <Space direction="vertical" size={2}>
            <Tag color="green">{t('expenses.approved_label')}</Tag>
            {r.approvedByFullname && <span style={{ fontSize: 12, color: '#888' }}>{r.approvedByFullname}</span>}
          </Space>
        )
        : <Tag color="orange">{t('expenses.pending_label')}</Tag>,
    },
    {
      title: t('common.actions'), key: 'actions',
      render: (_: unknown, r: Expense) => !r.approved && (
        <Popconfirm title={t('common.confirm_delete')} onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button icon={<DeleteOutlined />} danger size="small" />
        </Popconfirm>
      ),
    },
  ];

  const pendingTotal = expenses.filter(e => !e.approved).reduce((s, e) => s + e.total, 0);
  const approvedTotal = expenses.filter(e => e.approved).reduce((s, e) => s + e.total, 0);

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>{t('expenses.my_expenses_title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t('expenses.add_expense')}
        </Button>
      </Space>

      {expenses.length > 0 && (
        <Space style={{ marginBottom: 16 }}>
          <Tag color="orange">{t('expenses.pending_label')}: {formatCurrency(pendingTotal)}</Tag>
          <Tag color="green">{t('expenses.approved_label')}: {formatCurrency(approvedTotal)}</Tag>
        </Space>
      )}

      <Alert message={t('expenses.user_hint')} type="info" showIcon style={{ marginBottom: 16 }} />

      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={open}
        title={t('expenses.add_expense')}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="date" label={t('common.date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="total" label={t('common.amount')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter="сом" />
          </Form.Item>
          <Form.Item name="category" label={t('expenses.category')}>
            <Select allowClear placeholder={t('expenses.select_category')}>
              {CATEGORIES.map(c => (
                <Select.Option key={c} value={c}>{t(`expenses.categories.${c}`, c)}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label={t('common.description')} rules={[{ required: true }]}>
            <AutoComplete
              options={templates.map(tp => ({ value: tp }))}
              filterOption={(inputValue, option) =>
                option!.value.toLowerCase().includes(inputValue.toLowerCase())
              }
              placeholder={t('expenses.description_hint')}
            >
              <Input.TextArea rows={3} />
            </AutoComplete>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserExpensesPage;
