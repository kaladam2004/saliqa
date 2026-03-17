import React, { useState } from 'react';
import {
  Steps, Select, Button, Card, InputNumber, Typography,
  Result, Space, Alert, Table, Tag, Divider, Row, Col,
  Statistic, message,
} from 'antd';
import { BankOutlined, InboxOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getWarehouses } from '../../../api/warehouses';
import { createUserInvoice } from '../../../api/userInvoices';
import type { Warehouse, Product, UserInvoiceProductItem } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { formatCurrency } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface PickupLine extends UserInvoiceProductItem {
  key: number;
  productName?: string;
  stock?: number;
  price?: number;
}

const WarehousePickupWizard: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [lines, setLines] = useState<PickupLine[]>([{ key: 0, productId: 0, quantity: 1 }]);
  const [notes, setNotes] = useState('');
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

  const STEPS = [
    { title: t('wizards.warehouse_pickup.step_select_warehouse'), icon: <BankOutlined /> },
    { title: t('wizards.warehouse_pickup.step_select_products'), icon: <InboxOutlined /> },
    { title: t('wizards.warehouse_pickup.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });

  const warehouseProducts: Product[] = selectedWarehouse?.products ?? [];

  const mutation = useMutation({
    mutationFn: () => createUserInvoice({
      warehouseId: selectedWarehouse!.id,
      userId: user!.id,
      notes,
      products: lines
        .filter(l => l.productId > 0 && l.quantity > 0)
        .map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
    }),
    onSuccess: (inv) => { setInvoiceId(inv.id); setCurrent(2); },
    onError: () => message.error(t('wizards.warehouse_pickup.error_create')),
  });

  const setLine = (key: number, field: string, value: unknown) =>
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      if (field === 'productId') {
        const p = warehouseProducts.find((p: Product) => p.id === value);
        updated.productName = p?.name;
        updated.stock = p?.quantity;
        updated.price = p?.price;
        updated.unitPrice = p?.price;
      }
      return updated;
    }));

  const validLines = lines.filter(l => l.productId > 0 && l.quantity > 0);
  const total = validLines.reduce((s, l) => s + (l.unitPrice ?? l.price ?? 0) * l.quantity, 0);
  const hasOverStock = validLines.some(l => l.quantity > (l.stock ?? Infinity));

  const handleNext0 = () => {
    if (!selectedWarehouse) { message.error(t('wizards.warehouse_pickup.error_select_warehouse')); return; }
    setCurrent(1);
  };

  const handleSubmit = () => {
    if (validLines.length === 0) { message.error(t('wizards.warehouse_pickup.error_add_product')); return; }
    mutation.mutate();
  };

  const reset = () => {
    setCurrent(0);
    setSelectedWarehouse(null);
    setLines([{ key: 0, productId: 0, quantity: 1 }]);
    setNotes('');
    setInvoiceId(null);
  };

  const columns = [
    {
      title: t('common.product'), key: 'product', width: 280,
      render: (_: unknown, r: PickupLine) => (
        <Select style={{ width: '100%' }} value={r.productId || undefined}
          placeholder={t('wizards.warehouse_pickup.select_product')} showSearch optionFilterProp="label"
          onChange={v => setLine(r.key, 'productId', v)}>
          {warehouseProducts.map((p: Product) => (
            <Select.Option key={p.id} value={p.id} label={p.name}>
              <span>{p.name}</span>
              <Tag color={p.quantity > 0 ? 'green' : 'red'} style={{ marginLeft: 8, fontSize: 11 }}>
                {t('wizards.warehouse_pickup.available_tag', { count: p.quantity })}
              </Tag>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: t('wizards.warehouse_pickup.qty_to_take'), key: 'qty', width: 130,
      render: (_: unknown, r: PickupLine) => (
        <InputNumber min={1} value={r.quantity} style={{ width: '100%' }}
          status={r.quantity > (r.stock ?? Infinity) ? 'warning' : undefined}
          onChange={v => setLine(r.key, 'quantity', v ?? 1)} />
      ),
    },
    {
      title: t('wizards.warehouse_pickup.unit_price'), key: 'price', width: 130,
      render: (_: unknown, r: PickupLine) => (
        <Text>{r.price ? formatCurrency(r.price) : '-'}</Text>
      ),
    },
    {
      title: t('wizards.warehouse_pickup.subtotal'), key: 'subtotal', width: 120,
      render: (_: unknown, r: PickupLine) =>
        r.productId > 0 ? <Text strong>{formatCurrency((r.price ?? 0) * r.quantity)}</Text> : '-',
    },
    {
      title: '', key: 'del', width: 44,
      render: (_: unknown, r: PickupLine) => (
        <Button danger icon={<DeleteOutlined />} size="small"
          onClick={() => setLines(p => p.filter(l => l.key !== r.key))}
          disabled={lines.length === 1} />
      ),
    },
  ];

  return (
    <Card>
      <Title level={4}>{t('wizards.warehouse_pickup.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0 – Select Warehouse */}
      {current === 0 && (
        <div style={{ maxWidth: 500 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {t('wizards.warehouse_pickup.select_warehouse_hint')}
          </Text>
          <Select showSearch optionFilterProp="label" placeholder={t('wizards.warehouse_pickup.select_warehouse')}
            style={{ width: '100%' }} size="large"
            onChange={id => setSelectedWarehouse(warehouses.find((w: Warehouse) => w.id === id) ?? null)}>
            {warehouses.map((w: Warehouse) => (
              <Select.Option key={w.id} value={w.id} label={w.title}>
                <div>
                  <strong>{w.title}</strong>
                  <Tag style={{ marginLeft: 8 }}>{t('wizards.warehouse_pickup.products_count_tag', { count: w.products?.length ?? 0 })}</Tag>
                </div>
                {w.responsiblePerson && <Text type="secondary" style={{ fontSize: 12 }}>{w.responsiblePerson}</Text>}
              </Select.Option>
            ))}
          </Select>

          {selectedWarehouse && (
            <Card size="small" style={{ marginTop: 16, background: '#f0f5ff', border: '1px solid #adc6ff' }}>
              <Text strong>{selectedWarehouse.title}</Text><br />
              <Text type="secondary">{selectedWarehouse.responsiblePerson} · {selectedWarehouse.tel}</Text><br />
              <Tag color="blue" style={{ marginTop: 6 }}>{t('wizards.warehouse_pickup.products_in_stock', { count: selectedWarehouse.products?.length ?? 0 })}</Tag>
            </Card>
          )}

          <Button type="primary" size="large" style={{ marginTop: 16 }}
            onClick={handleNext0} disabled={!selectedWarehouse}>
            {t('wizards.warehouse_pickup.continue_to_products')}
          </Button>
        </div>
      )}

      {/* Step 1 – Select Products */}
      {current === 1 && (
        <>
          <Alert
            message={<>{t('wizards.warehouse_pickup.picking_up_from', { warehouse: selectedWarehouse?.title })}</>}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
          {hasOverStock && (
            <Alert message={t('wizards.warehouse_pickup.over_stock_warning')} type="warning" showIcon style={{ marginBottom: 12 }} />
          )}
          <Table
            dataSource={lines}
            columns={columns}
            pagination={false}
            rowKey="key"
            size="small"
            summary={() => validLines.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3} align="right">
                  <Text strong>{t('wizards.warehouse_pickup.total_value_label')}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ fontSize: 15 }}>{formatCurrency(total)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            ) : null}
          />
          <Space style={{ marginTop: 12 }}>
            <Button icon={<PlusOutlined />} onClick={() => setLines(p => [...p, { key: p.length, productId: 0, quantity: 1 }])}>
              {t('wizards.warehouse_pickup.add_row')}
            </Button>
          </Space>
          <Divider />
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Text strong>{t('common.notes')}</Text>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={t('wizards.warehouse_pickup.notes_placeholder')}
                style={{ width: '100%', marginTop: 6, padding: '7px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }} />
            </Col>
          </Row>
          <Space>
            <Button onClick={() => setCurrent(0)}>{t('common.back')}</Button>
            <Button type="primary" size="large" onClick={handleSubmit} loading={mutation.isPending}>
              {t('wizards.warehouse_pickup.confirm_pickup', { count: validLines.length })}
            </Button>
          </Space>
        </>
      )}

      {/* Done */}
      {current === 2 && (
        <Result
          status="success"
          title={t('wizards.warehouse_pickup.pickup_created_title', { id: invoiceId })}
          subTitle={t('wizards.warehouse_pickup.pickup_created_sub', { warehouse: selectedWarehouse?.title, count: validLines.length, total: formatCurrency(total) })}
          extra={[<Button type="primary" key="new" onClick={reset}>{t('wizards.warehouse_pickup.new_pickup')}</Button>]}
        >
          <Row gutter={16}>
            <Col span={8}><Statistic title={t('wizards.warehouse_pickup.warehouse_label')} value={selectedWarehouse?.title} /></Col>
            <Col span={8}><Statistic title={t('wizards.warehouse_pickup.products_label')} value={validLines.length} /></Col>
            <Col span={8}><Statistic title={t('wizards.warehouse_pickup.total_value')} value={formatCurrency(total)} /></Col>
          </Row>
        </Result>
      )}
    </Card>
  );
};

export default WarehousePickupWizard;
