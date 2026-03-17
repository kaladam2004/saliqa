import React, { useState } from 'react';
import {
  Steps, Form, Select, Button, Card, InputNumber, Table,
  Typography, Result, Tag, Space, Switch, Divider,
  Statistic, Row, Col, Alert, message,
} from 'antd';
import {
  ShopOutlined, AppstoreOutlined, CheckCircleOutlined,
  PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getShops } from '../../../api/shops';
import { getProducts } from '../../../api/products';
import { createInvoice } from '../../../api/invoices';
import { getRepStock } from '../../../api/userInvoices';
import type { Shop, Product, Invoice, InvoiceProductItem } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { formatCurrency } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface LineItem extends InvoiceProductItem {
  key: number;
  productName?: string;
  stock?: number;
}

const DailySalesWizard: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([{ key: 0, productId: 0, quantity: 1 }]);
  const [notes, setNotes] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  const STEPS = [
    { title: t('wizards.daily_sales.step_select_shop'), icon: <ShopOutlined /> },
    { title: t('wizards.daily_sales.step_add_products'), icon: <AppstoreOutlined /> },
    { title: t('wizards.daily_sales.step_review'), icon: <CheckCircleOutlined /> },
  ];

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: repStock = {} } = useQuery({
    queryKey: ['rep-stock', user?.id],
    queryFn: () => getRepStock(user!.id),
    enabled: !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: () => createInvoice({
      shopId: selectedShop!.id,
      userId: user!.id,
      free: isFree,
      notes,
      products: lines.filter(l => l.productId > 0).map(l => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    }),
    onSuccess: (inv) => { setCreatedInvoice(inv); setCurrent(3); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || t('wizards.daily_sales.error_create'));
    },
  });

  const setLine = (key: number, field: string, value: unknown) =>
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      if (field === 'productId') {
        const p = products.find((p: Product) => p.id === value);
        updated.productName = p?.name;
        updated.stock = repStock[value as number] ?? 0;
        if (!updated.unitPrice) updated.unitPrice = p?.price;
      }
      return updated;
    }));

  const addLine = () =>
    setLines(prev => [...prev, { key: prev.length, productId: 0, quantity: 1 }]);

  const removeLine = (key: number) =>
    setLines(prev => prev.filter(l => l.key !== key));

  const total = lines.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.quantity, 0);
  const validLines = lines.filter(l => l.productId > 0 && l.quantity > 0);
  const hasLowStock = validLines.some(l => l.quantity > (l.stock ?? 0));

  const handleNext0 = () => {
    if (!selectedShop) { message.error(t('wizards.daily_sales.error_select_shop')); return; }
    setCurrent(1);
  };

  const handleNext1 = () => {
    if (validLines.length === 0) { message.error(t('wizards.daily_sales.error_add_product')); return; }
    const bad = validLines.find(l => !l.productId);
    if (bad) { message.error(t('wizards.daily_sales.error_row_product')); return; }
    setCurrent(2);
  };

  const reset = () => {
    setCurrent(0);
    setSelectedShop(null);
    setLines([{ key: 0, productId: 0, quantity: 1 }]);
    setCreatedInvoice(null);
    setIsFree(false);
    setNotes('');
  };

  const columns = [
    {
      title: t('common.product'), key: 'product', width: 260,
      render: (_: unknown, r: LineItem) => (
        <Select style={{ width: '100%' }} value={r.productId || undefined}
          placeholder={t('wizards.daily_sales.select_product')} showSearch optionFilterProp="label"
          onChange={v => setLine(r.key, 'productId', v)}>
          {products.filter((p: Product) => (repStock[p.id] ?? 0) > 0).map((p: Product) => (
            <Select.Option key={p.id} value={p.id} label={p.name}>
              <span>{p.name}</span>
              <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>
                {t('wizards.daily_sales.in_stock', { count: repStock[p.id] ?? 0 })}
              </Tag>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: t('common.qty'), key: 'qty', width: 100,
      render: (_: unknown, r: LineItem) => (
        <InputNumber min={1} value={r.quantity} style={{ width: '100%' }}
          status={r.quantity > (r.stock ?? Infinity) ? 'warning' : undefined}
          onChange={v => setLine(r.key, 'quantity', v ?? 1)} />
      ),
    },
    {
      title: t('common.unit_price'), key: 'price', width: 130,
      render: (_: unknown, r: LineItem) => (
        <InputNumber value={r.unitPrice} min={0} style={{ width: '100%' }}
          onChange={v => setLine(r.key, 'unitPrice', v ?? 0)} />
      ),
    },
    {
      title: t('common.total'), key: 'total', width: 110,
      render: (_: unknown, r: LineItem) =>
        <Text strong>{formatCurrency((r.unitPrice ?? 0) * r.quantity)}</Text>,
    },
    {
      title: '', key: 'del', width: 44,
      render: (_: unknown, r: LineItem) => (
        <Button danger icon={<DeleteOutlined />} size="small"
          onClick={() => removeLine(r.key)} disabled={lines.length === 1} />
      ),
    },
  ];

  return (
    <Card>
      <Title level={4}>{t('wizards.daily_sales.title')}</Title>
      <Steps current={current > 2 ? 2 : current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* ── Step 0: Select Shop ──────────────────────────────────────────── */}
      {current === 0 && (
        <div style={{ maxWidth: 500 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {t('wizards.daily_sales.delivering_hint')}
          </Text>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('wizards.daily_sales.search_shop')}
            style={{ width: '100%', marginBottom: 16 }}
            value={selectedShop?.id}
            onChange={id => setSelectedShop(shops.find((s: Shop) => s.id === id) ?? null)}
            size="large"
          >
            {shops.filter((s: Shop) => !s.test).map((s: Shop) => (
              <Select.Option key={s.id} value={s.id} label={s.title}>
                <div>
                  <strong>{s.title}</strong>
                  {s.tel && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{s.tel}</Text>}
                </div>
              </Select.Option>
            ))}
          </Select>
          {selectedShop && (
            <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Text><strong>{selectedShop.title}</strong></Text><br />
              <Text type="secondary">{selectedShop.tel || ''} {selectedShop.gps ? `· GPS: ${selectedShop.gps}` : ''}</Text>
            </Card>
          )}
          <Form.Item label={t('wizards.daily_sales.free_invoice_label')}>
            <Switch checked={isFree} onChange={setIsFree} />
          </Form.Item>
          <Button type="primary" size="large" onClick={handleNext0} disabled={!selectedShop}>
            {t('wizards.daily_sales.continue_to_products')}
          </Button>
        </div>
      )}

      {/* ── Step 1: Add Products ─────────────────────────────────────────── */}
      {current === 1 && (
        <>
          <Alert
            message={<>{t('wizards.daily_sales.delivering_to', { shop: selectedShop?.title })} {isFree && <Tag color="blue">{t('common.free')}</Tag>}</>}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          {hasLowStock && (
            <Alert message={t('wizards.daily_sales.low_stock_warning')} type="warning" showIcon style={{ marginBottom: 12 }} />
          )}
          <Table
            dataSource={lines}
            columns={columns}
            pagination={false}
            rowKey="key"
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3} align="right">
                  <Text strong>{t('wizards.daily_sales.total_label')}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ fontSize: 16 }}>{formatCurrency(isFree ? 0 : total)}</Text>
                  {isFree && <Tag color="blue" style={{ marginLeft: 8 }}>{t('common.free')}</Tag>}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            )}
          />
          <Space style={{ marginTop: 12 }}>
            <Button icon={<PlusOutlined />} onClick={addLine}>{t('wizards.daily_sales.add_row')}</Button>
          </Space>
          <Divider />
          <Form.Item label={t('common.notes')}>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('wizards.daily_sales.notes_placeholder')}
              style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            />
          </Form.Item>
          <Space>
            <Button onClick={() => setCurrent(0)}>{t('common.back')}</Button>
            <Button type="primary" onClick={handleNext1}>{t('wizards.daily_sales.review_invoice')}</Button>
          </Space>
        </>
      )}

      {/* ── Step 2: Review ───────────────────────────────────────────────── */}
      {current === 2 && (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic title={t('common.shop')} value={selectedShop?.title} valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic title={t('wizards.daily_sales.items_label')} value={validLines.length} suffix={t('common.product')} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic title={t('common.total')} value={isFree ? t('common.free') : formatCurrency(total)} valueStyle={{ color: isFree ? '#52c41a' : '#1677ff', fontSize: 14 }} />
              </Card>
            </Col>
          </Row>
          <Table
            size="small"
            pagination={false}
            dataSource={validLines}
            rowKey="key"
            columns={[
              { title: t('common.product'), dataIndex: 'productName' },
              { title: t('common.qty'), dataIndex: 'quantity', width: 70 },
              { title: t('common.unit_price'), dataIndex: 'unitPrice', render: formatCurrency, width: 120 },
              { title: t('common.total'), key: 'total', render: (_: unknown, r: LineItem) => formatCurrency((r.unitPrice ?? 0) * r.quantity), width: 120 },
            ]}
          />
          {notes && <Alert message={`${t('common.notes')}: ${notes}`} type="info" style={{ marginTop: 12 }} />}
          <Space style={{ marginTop: 20 }}>
            <Button onClick={() => setCurrent(1)}>{t('common.back')}</Button>
            <Button type="primary" size="large" onClick={() => mutation.mutate()} loading={mutation.isPending}>
              {t('wizards.daily_sales.confirm_create')}
            </Button>
          </Space>
        </>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────── */}
      {current === 3 && (
        <Result
          status="success"
          title={t('wizards.daily_sales.invoice_created_title', { id: createdInvoice?.id })}
          subTitle={`${selectedShop?.title} — ${formatCurrency(createdInvoice?.totalPrice ?? 0)}`}
          extra={[
            <Button type="primary" key="new" onClick={reset}>{t('wizards.daily_sales.new_invoice')}</Button>,
          ]}
        />
      )}
    </Card>
  );
};

export default DailySalesWizard;
