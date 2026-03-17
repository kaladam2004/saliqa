import React, { useState } from 'react';
import {
  Steps, Select, Button, Card, InputNumber, Typography,
  Result, Space, Alert, Table, Tag, Divider, message,
} from 'antd';
import { ShopOutlined, RollbackOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getShops } from '../../../api/shops';
import { getProducts } from '../../../api/products';
import { getInvoices } from '../../../api/invoices';
import { createReturn } from '../../../api/returns';
import type { Shop, Product, Invoice, ReturnProductItem } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface ReturnLine extends ReturnProductItem { key: number; productName?: string; }

const ProcessReturnWizard: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<ReturnLine[]>([{ key: 0, productId: 0, quantity: 1 }]);
  const [description, setDescription] = useState('');

  const STEPS = [
    { title: t('wizards.process_return.step_select_shop'), icon: <ShopOutlined /> },
    { title: t('wizards.process_return.step_returned_products'), icon: <RollbackOutlined /> },
    { title: t('wizards.process_return.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });

  const shopInvoices = invoices.filter((i: Invoice) => i.shop?.id === selectedShop?.id);

  const mutation = useMutation({
    mutationFn: () => createReturn({
      userId: user!.id,
      shopId: selectedShop!.id,
      invoiceId: selectedInvoice?.id,
      description,
      products: lines.filter(l => l.productId > 0).map(({ productId, quantity }) => ({ productId, quantity })),
    }),
    onSuccess: () => { setCurrent(2); },
    onError: () => message.error(t('wizards.process_return.error_create')),
  });

  const setLine = (key: number, field: string, value: unknown) =>
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      if (field === 'productId') {
        updated.productName = products.find((p: Product) => p.id === value)?.name;
      }
      return updated;
    }));

  const handleNext0 = () => {
    if (!selectedShop) { message.error(t('wizards.process_return.error_select_shop')); return; }
    setCurrent(1);
  };

  const handleSubmit = () => {
    const valid = lines.filter(l => l.productId > 0 && l.quantity > 0);
    if (valid.length === 0) { message.error(t('wizards.process_return.error_add_product')); return; }
    mutation.mutate();
  };

  const reset = () => {
    setCurrent(0);
    setSelectedShop(null);
    setSelectedInvoice(null);
    setLines([{ key: 0, productId: 0, quantity: 1 }]);
    setDescription('');
  };

  const columns = [
    {
      title: t('common.product'), key: 'product', width: 280,
      render: (_: unknown, r: ReturnLine) => (
        <Select style={{ width: '100%' }} value={r.productId || undefined}
          placeholder={t('wizards.process_return.select_product')} showSearch optionFilterProp="label"
          onChange={v => setLine(r.key, 'productId', v)}>
          {products.map((p: Product) => (
            <Select.Option key={p.id} value={p.id} label={p.name}>{p.name}</Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: t('wizards.process_return.qty_returned'), key: 'qty', width: 130,
      render: (_: unknown, r: ReturnLine) => (
        <InputNumber min={1} value={r.quantity} style={{ width: '100%' }}
          onChange={v => setLine(r.key, 'quantity', v ?? 1)} />
      ),
    },
    {
      title: '', key: 'del', width: 44,
      render: (_: unknown, r: ReturnLine) => (
        <Button danger icon={<DeleteOutlined />} size="small"
          onClick={() => setLines(p => p.filter(l => l.key !== r.key))}
          disabled={lines.length === 1} />
      ),
    },
  ];

  return (
    <Card style={{ maxWidth: 700 }}>
      <Title level={4}>{t('wizards.process_return.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0 */}
      {current === 0 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Text strong>{t('wizards.process_return.shop_label')}</Text>
            <Select showSearch optionFilterProp="label" placeholder={t('wizards.process_return.select_shop')}
              style={{ width: '100%', marginTop: 6 }} size="large"
              onChange={id => { setSelectedShop(shops.find((s: Shop) => s.id === id) ?? null); setSelectedInvoice(null); }}>
              {shops.filter((s: Shop) => !s.test).map((s: Shop) => (
                <Select.Option key={s.id} value={s.id} label={s.title}>{s.title}</Select.Option>
              ))}
            </Select>
          </div>

          {selectedShop && (
            <div>
              <Text strong>{t('wizards.process_return.related_invoice')} <Tag>{t('wizards.process_return.optional_tag')}</Tag></Text>
              <Select placeholder={t('wizards.process_return.link_invoice_placeholder')} style={{ width: '100%', marginTop: 6 }}
                allowClear onChange={id => setSelectedInvoice(invoices.find((i: Invoice) => i.id === id) ?? null)}>
                {shopInvoices.map((i: Invoice) => (
                  <Select.Option key={i.id} value={i.id}>
                    Invoice #{i.id} — {new Date(i.date).toLocaleDateString()}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}

          <Button type="primary" size="large" onClick={handleNext0} disabled={!selectedShop}>
            {t('wizards.process_return.continue_btn')}
          </Button>
        </Space>
      )}

      {/* Step 1 */}
      {current === 1 && (
        <>
          <Alert
            message={<>{t('wizards.process_return.return_from', { shop: selectedShop?.title })}{selectedInvoice && <> · Invoice #{selectedInvoice.id}</>}</>}
            type="warning" showIcon style={{ marginBottom: 16 }}
          />
          <Table dataSource={lines} columns={columns} pagination={false} rowKey="key" size="small" />
          <Space style={{ marginTop: 12 }}>
            <Button icon={<PlusOutlined />} onClick={() => setLines(p => [...p, { key: p.length, productId: 0, quantity: 1 }])}>
              {t('wizards.process_return.add_row')}
            </Button>
          </Space>
          <Divider />
          <div>
            <Text strong>{t('wizards.process_return.reason_notes')}</Text>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t('wizards.process_return.reason_placeholder')}
              style={{ width: '100%', marginTop: 6, padding: '7px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }} />
          </div>
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => setCurrent(0)}>{t('common.back')}</Button>
            <Button type="primary" onClick={handleSubmit} loading={mutation.isPending}>
              {t('wizards.process_return.confirm_return')}
            </Button>
          </Space>
        </>
      )}

      {/* Done */}
      {current === 2 && (
        <Result
          status="success"
          title={t('wizards.process_return.return_processed_title')}
          subTitle={t('wizards.process_return.return_processed_sub', { count: lines.filter(l => l.productId > 0).length, shop: selectedShop?.title })}
          extra={[<Button type="primary" key="new" onClick={reset}>{t('wizards.process_return.process_another')}</Button>]}
        />
      )}
    </Card>
  );
};

export default ProcessReturnWizard;
