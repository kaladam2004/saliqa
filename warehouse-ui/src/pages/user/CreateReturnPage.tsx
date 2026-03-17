import React, { useState } from 'react';
import { Form, Select, Button, InputNumber, Table, Typography, Card, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getShops } from '../../api/shops';
import { getProducts } from '../../api/products';
import { getInvoices } from '../../api/invoices';
import { createReturn } from '../../api/returns';
import type { ReturnRequest, ReturnProductItem } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const CreateReturnPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [items, setItems] = useState<ReturnProductItem[]>([]);
  const [form] = Form.useForm();

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });

  const mutation = useMutation({
    mutationFn: (data: ReturnRequest) => createReturn(data),
    onSuccess: () => { message.success(t('returns.return_created')); form.resetFields(); setItems([]); },
  });

  const handleSubmit = (values: { shopId: number; invoiceId?: number; description?: string }) => {
    if (!items.length) { message.error(t('invoices.add_one_product')); return; }
    mutation.mutate({ ...values, userId: user!.id, products: items });
  };

  const columns = [
    {
      title: t('common.product'), key: 'product', width: 250,
      render: (_: unknown, _r: unknown, idx: number) => (
        <Select style={{ width: '100%' }} value={items[idx].productId || undefined}
          onChange={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, productId: v } : it))}>
          {products.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
        </Select>
      ),
    },
    {
      title: t('common.qty'), key: 'qty', width: 100,
      render: (_: unknown, _r: unknown, idx: number) => (
        <InputNumber min={1} value={items[idx].quantity}
          onChange={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: v ?? 1 } : it))} />
      ),
    },
    {
      title: '', key: 'del', width: 50,
      render: (_: unknown, _r: unknown, idx: number) => (
        <Button danger icon={<DeleteOutlined />} size="small" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} />
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={4}>{t('returns.create_return')}</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="shopId" label={t('common.shop')} rules={[{ required: true }]}>
            <Select placeholder={t('common.shop')}>
              {shops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="invoiceId" label={t('returns.related_invoice')}>
            <Select placeholder={t('common.invoice')} allowClear>
              {invoices.map(i => <Select.Option key={i.id} value={i.id}>Invoice #{i.id} - {i.shop?.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Select.Option value="">-</Select.Option>
          </Form.Item>

          <Table dataSource={items.map((item, idx) => ({ ...item, key: idx }))} columns={columns} pagination={false} size="small" style={{ margin: '8px 0' }} />
          <Space style={{ marginBottom: 16 }}>
            <Button icon={<PlusOutlined />} onClick={() => setItems(prev => [...prev, { productId: 0, quantity: 1 }])}>{t('invoices.add_product')}</Button>
          </Space>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} size="large">{t('returns.create_return')}</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default CreateReturnPage;
