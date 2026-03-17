import React, { useState } from 'react';
import { Form, Select, Button, Input, InputNumber, Table, Space, Typography, message, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getWarehouses } from '../../api/warehouses';
import { getProducts } from '../../api/products';
import { createUserInvoice } from '../../api/userInvoices';
import type { UserInvoiceRequest, UserInvoiceProductItem, Product } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

const UserInvoicePage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [items, setItems] = useState<Array<UserInvoiceProductItem & { productName?: string }>>([]);
  const [form] = Form.useForm();

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const mutation = useMutation({
    mutationFn: (data: UserInvoiceRequest) => createUserInvoice(data),
    onSuccess: () => { message.success(t('user_invoices.pickup_created')); form.resetFields(); setItems([]); },
  });

  const addItem = () => setItems(prev => [...prev, { productId: 0, quantity: 1 }]);
  const updateItem = (idx: number, field: string, value: unknown) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const p = products.find(p => p.id === value);
        updated.productName = p?.name;
        updated.unitPrice = p?.price;
      }
      return updated;
    }));
  };
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const productById = (id: number): Product | undefined => products.find(p => p.id === id);

  const handleSubmit = (values: { warehouseId: number; notes: string }) => {
    if (!items.length) { message.error(t('invoices.add_one_product')); return; }
    mutation.mutate({ warehouseId: values.warehouseId, userId: user!.id, notes: values.notes, products: items });
  };

  const columns = [
    {
      title: t('upload.photo'), key: 'img', width: 52,
      render: (_: unknown, _r: unknown, idx: number) => {
        const p = productById(items[idx].productId);
        return p?.image
          ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
          : <span style={{ color: '#bbb', fontSize: 11 }}>—</span>;
      },
    },
    {
      title: t('common.product'), key: 'product', width: 250,
      render: (_: unknown, _r: unknown, idx: number) => (
        <Select style={{ width: '100%' }} value={items[idx].productId || undefined} onChange={v => updateItem(idx, 'productId', v)}
          optionLabelProp="label">
          {products.map(p => (
            <Select.Option key={p.id} value={p.id} label={p.name}>
              <Space size={6}>
                {p.image
                  ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3 }} />
                  : <span style={{ display: 'inline-block', width: 24 }} />}
                <span>{p.name}</span>
              </Space>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: t('common.qty'), key: 'qty', width: 100,
      render: (_: unknown, _r: unknown, idx: number) => (
        <InputNumber min={1} value={items[idx].quantity} onChange={v => updateItem(idx, 'quantity', v ?? 1)} />
      ),
    },
    {
      title: '', key: 'del', width: 50,
      render: (_: unknown, _r: unknown, idx: number) => (
        <Button danger icon={<DeleteOutlined />} size="small" onClick={() => removeItem(idx)} />
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={4}>{t('user_invoices.pickup_title')}</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehouseId" label={t('common.warehouse')} rules={[{ required: true }]}>
                <Select placeholder={t('common.warehouse')}>
                  {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Table dataSource={items.map((item, idx) => ({ ...item, key: idx }))} columns={columns} pagination={false} size="small" style={{ margin: '8px 0' }} />
          <Space style={{ marginBottom: 16 }}>
            <Button icon={<PlusOutlined />} onClick={addItem}>{t('invoices.add_product')}</Button>
          </Space>

          <Form.Item name="notes" label={t('common.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} size="large">
              {t('user_invoices.create_pickup')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default UserInvoicePage;
