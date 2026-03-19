import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, InputNumber, DatePicker, Typography,
  Tag, Space, Popconfirm, message, AutoComplete, Select, Input, Card, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpensesByAdmin, createExpense, deleteExpense } from '../../api/expenses';
import { useAuthStore } from '../../store/authStore';
import { useExpenseTemplates } from '../../hooks/useExpenseTemplates';
import type { Expense } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title } = Typography;

const CATEGORIES = ['salary', 'fuel', 'ingredients', 'utilities', 'other'];

const AdminExpensesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const { templates, saveTemplate } = useExpenseTemplates();
  const [dateFilter, setDateFilter] = useState<{ from?: string; to?: string }>({});

  const { data: allExpenses = [], isLoading } = useQuery({
    queryKey: ['admin-expenses', user?.id],
    queryFn: () => getExpensesByAdmin(user!.id),
    enabled: !!user?.id,
  });

  const expenses = allExpenses.filter(e => {
    if (dateFilter.from && new Date(e.date) < new Date(dateFilter.from)) return false;
    if (dateFilter.to && new Date(e.date) > new Date(dateFilter.to)) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses', user?.id] });
      message.success(t('expenses.created'));
      setOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses', user?.id] });
      message.success(t('expenses.deleted'));
    },
  });

  const handleSubmit = (values: { description: string; date: dayjs.Dayjs; total: number; category?: string }) => {
    saveTemplate(values.description);
    createMutation.mutate({
      adminId: user!.id,
      description: values.description,
      date: values.date.format('YYYY-MM-DD'),
      total: values.total,
      category: values.category,
    });
  };

  const setToday = () => setDateFilter({
    from: dayjs().startOf('day').toISOString(),
    to: dayjs().endOf('day').toISOString(),
  });

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
      title: t('common.actions'), key: 'actions',
      render: (_: unknown, record: Expense) => (
        <Popconfirm title={t('common.confirm_delete')} onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button icon={<DeleteOutlined />} danger size="small" />
        </Popconfirm>
      ),
    },
  ];

  const total = expenses.reduce((s, e) => s + e.total, 0);

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }} wrap>
        <Title level={4} style={{ margin: 0 }}>{t('expenses.my_expenses_title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t('expenses.add_expense')}
        </Button>
      </Space>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
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
            <Button block onClick={() => setDateFilter({})}>{t('common.all')}</Button>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Statistic
              title={t('payments.total_collected')}
              value={total}
              formatter={v => formatCurrency(Number(v))}
            />
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

      <Modal
        open={open}
        title={t('expenses.add_expense')}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="date" label={t('common.date')} rules={[{ required: true }]}
            initialValue={dayjs()}>
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

export default AdminExpensesPage;
