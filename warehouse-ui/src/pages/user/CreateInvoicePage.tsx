import React, { useState } from 'react';
import { Form, Select, Button, InputNumber, Table, Space, Typography, Switch, message, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getShops } from '../../api/shops';
import { getProducts } from '../../api/products';
import { createInvoice } from '../../api/invoices';
import type { InvoiceRequest, InvoiceProductItem, Product } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

const CreateInvoicePage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [items, setItems] = useState<Array<InvoiceProductItem & { productName?: string }>>([]);
  const [form] = Form.useForm();

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const mutation = useMutation({
    mutationFn: (data: InvoiceRequest) => createInvoice(data),
    onSuccess: () => { message.success(t('invoices.invoice_created')); form.resetFields(); setItems([]); },
  });

  const addItem = () => setItems(prev => [...prev, { productId: 0, quantity: 1 }]);

  const updateItem = (idx: number, field: string, value: unknown) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        updated.productName = product?.name;
        if (!updated.unitPrice) updated.unitPrice = product?.price;
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const total = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);

  const handleSubmit = (values: { shopId: number; free: boolean }) => {
    if (items.length === 0) { message.error(t('invoices.add_one_product')); return; }
    const invalidItem = items.find(item => !item.productId || item.quantity < 1);
    if (invalidItem) { message.error(t('invoices.all_items_valid')); return; }
    mutation.mutate({ shopId: values.shopId, userId: user!.id, free: values.free, products: items });
  };

  const productById = (id: number): Product | undefined => products.find(p => p.id === id);

  const itemColumns = [
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
        <Select style={{ width: '100%' }} value={items[idx].productId || undefined} placeholder={t('common.product')}
          onChange={v => updateItem(idx, 'productId', v)}
          optionLabelProp="label">
          {products.map(p => (
            <Select.Option key={p.id} value={p.id} label={p.name}>
              <Space size={6}>
                {p.image
                  ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3 }} />
                  : <span style={{ display: 'inline-block', width: 24 }} />}
                <span>{p.name} (Stock: {p.quantity})</span>
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
      title: t('common.unit_price'), key: 'price', width: 130,
      render: (_: unknown, _r: unknown, idx: number) => (
        <InputNumber value={items[idx].unitPrice} onChange={v => updateItem(idx, 'unitPrice', v)} />
      ),
    },
    {
      title: t('common.total'), key: 'total', width: 100,
      render: (_: unknown, _r: unknown, idx: number) =>
        formatCurrency((items[idx].unitPrice || 0) * items[idx].quantity),
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
      <Typography.Title level={4}>{t('invoices.create_invoice')}</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ free: false }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="shopId" label={t('common.shop')} rules={[{ required: true }]}>
                <Select placeholder={t('common.shop')}>
                  {shops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="free" label={t('invoices.free_invoice')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Text strong>{t('menu.products')}</Typography.Text>
          <Table
            dataSource={items.map((item, idx) => ({ ...item, key: idx }))}
            columns={itemColumns}
            pagination={false}
            style={{ margin: '8px 0' }}
            size="small"
          />
          <Space>
            <Button icon={<PlusOutlined />} onClick={addItem}>{t('invoices.add_product')}</Button>
            <Typography.Text strong>{t('common.total')}: {formatCurrency(total)}</Typography.Text>
          </Space>

          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} size="large">
              {t('invoices.create_invoice')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default CreateInvoicePage;
