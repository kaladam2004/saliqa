import React, { useState } from 'react';
import {
  Steps, Form, Button, Card, InputNumber, DatePicker,
  Typography, Result, Space, Table, Input, Select,
  Divider, Tag, message, Row,
} from 'antd';
import {
  AppstoreOutlined, NumberOutlined, BankOutlined, CheckCircleOutlined,
  PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createProducts, addToWarehouse } from '../../../api/products';
import { getWarehouses } from '../../../api/warehouses';
import type { Product, ProductRequest } from '../../../types';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface ProductRow extends ProductRequest {
  key: number;
}

const emptyRow = (key: number): ProductRow => ({
  key, name: '', price: 0, initialQuantity: 0, description: '',
});

const OnboardProductWizard: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [rows, setRows] = useState<ProductRow[]>([emptyRow(0)]);
  const [createdProducts, setCreatedProducts] = useState<Product[]>([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const STEPS = [
    { title: t('wizards.onboard_product.step_details'), icon: <AppstoreOutlined /> },
    { title: t('wizards.onboard_product.step_stock'), icon: <NumberOutlined /> },
    { title: t('wizards.onboard_product.step_assign'), icon: <BankOutlined /> },
    { title: t('wizards.onboard_product.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });

  const createMutation = useMutation({
    mutationFn: (requests: ProductRequest[]) => createProducts(requests),
    onSuccess: (products) => {
      setCreatedProducts(products);
      setCurrent(2);
    },
    onError: () => message.error(t('wizards.onboard_product.error_create')),
  });

  const assignMutation = useMutation({
    mutationFn: async (warehouseIds: number[]) => {
      const productIds = createdProducts.map(p => p.id);
      await Promise.all(warehouseIds.map(wId => addToWarehouse(wId, productIds)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setCurrent(3);
    },
    onError: () => message.error(t('wizards.onboard_product.error_assign')),
  });

  const updateRow = (key: number, field: string, value: unknown) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));

  const addRow = () => setRows(prev => [...prev, emptyRow(prev.length)]);
  const removeRow = (key: number) => setRows(prev => prev.filter(r => r.key !== key));

  const handleStep0to1 = () => {
    const invalid = rows.some(r => !r.name.trim() || !r.price);
    if (invalid) { message.error(t('wizards.onboard_product.error_name_price')); return; }
    setCurrent(1);
  };

  const handleStep1to2 = () => {
    const requests: ProductRequest[] = rows.map(r => ({
      name: r.name,
      price: r.price,
      description: r.description,
      initialQuantity: r.initialQuantity ?? 0,
      manufactureDate: r.manufactureDate,
      expireDate: r.expireDate,
    }));
    createMutation.mutate(requests);
  };

  const handleStep2to3 = () => {
    if (selectedWarehouseIds.length === 0) {
      assignMutation.mutate([]);
    } else {
      assignMutation.mutate(selectedWarehouseIds);
    }
  };

  const reset = () => {
    setCurrent(0);
    setRows([emptyRow(0)]);
    setCreatedProducts([]);
    setSelectedWarehouseIds([]);
  };

  const step0Columns = [
    {
      title: t('wizards.onboard_product.product_name_col'), key: 'name', width: 220,
      render: (_: unknown, r: ProductRow) => (
        <Input value={r.name} placeholder="Coca-Cola 1L"
          onChange={e => updateRow(r.key, 'name', e.target.value)} />
      ),
    },
    {
      title: t('wizards.onboard_product.price_col'), key: 'price', width: 130,
      render: (_: unknown, r: ProductRow) => (
        <InputNumber value={r.price} min={0} style={{ width: '100%' }}
          onChange={v => updateRow(r.key, 'price', v ?? 0)} />
      ),
    },
    {
      title: t('wizards.onboard_product.description_col'), key: 'description',
      render: (_: unknown, r: ProductRow) => (
        <Input value={r.description} placeholder={t('wizards.onboard_product.optional_placeholder')}
          onChange={e => updateRow(r.key, 'description', e.target.value)} />
      ),
    },
    {
      title: '', key: 'del', width: 40,
      render: (_: unknown, r: ProductRow) => (
        <Button danger icon={<DeleteOutlined />} size="small"
          onClick={() => removeRow(r.key)} disabled={rows.length === 1} />
      ),
    },
  ];

  const step1Columns = [
    { title: t('common.product'), dataIndex: 'name', width: 180, render: (v: string) => <strong>{v}</strong> },
    {
      title: t('wizards.onboard_product.initial_qty_col'), key: 'qty', width: 110,
      render: (_: unknown, r: ProductRow) => (
        <InputNumber value={r.initialQuantity} min={0} style={{ width: '100%' }}
          onChange={v => updateRow(r.key, 'initialQuantity', v ?? 0)} />
      ),
    },
    {
      title: t('wizards.onboard_product.manufacture_date_col'), key: 'mfg', width: 155,
      render: (_: unknown, r: ProductRow) => (
        <DatePicker style={{ width: '100%' }}
          value={r.manufactureDate ? dayjs(r.manufactureDate) : null}
          onChange={v => updateRow(r.key, 'manufactureDate', v ? v.format('YYYY-MM-DD') : undefined)} />
      ),
    },
    {
      title: t('wizards.onboard_product.expire_date_col'), key: 'exp', width: 155,
      render: (_: unknown, r: ProductRow) => (
        <DatePicker style={{ width: '100%' }}
          value={r.expireDate ? dayjs(r.expireDate) : null}
          onChange={v => updateRow(r.key, 'expireDate', v ? v.format('YYYY-MM-DD') : undefined)} />
      ),
    },
  ];

  return (
    <Card style={{ maxWidth: 900 }}>
      <Title level={4}>{t('wizards.onboard_product.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0 – Product Names & Prices */}
      {current === 0 && (
        <>
          <Text type="secondary">{t('wizards.onboard_product.enter_products_hint')}</Text>
          <Table
            dataSource={rows}
            columns={step0Columns}
            pagination={false}
            rowKey="key"
            style={{ marginTop: 16 }}
            size="small"
          />
          <Space style={{ marginTop: 12 }}>
            <Button icon={<PlusOutlined />} onClick={addRow}>{t('wizards.onboard_product.add_row')}</Button>
            <Button type="primary" onClick={handleStep0to1}>
              {t('wizards.onboard_product.next_quantities')}
            </Button>
          </Space>
        </>
      )}

      {/* Step 1 – Quantities & Batch Dates */}
      {current === 1 && (
        <>
          <Text type="secondary">{t('wizards.onboard_product.stock_hint')}</Text>
          <Table
            dataSource={rows}
            columns={step1Columns}
            pagination={false}
            rowKey="key"
            style={{ marginTop: 16 }}
            size="small"
          />
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => setCurrent(0)}>{t('common.back')}</Button>
            <Button type="primary" onClick={handleStep1to2} loading={createMutation.isPending}>
              {t('wizards.onboard_product.create_products_btn', { count: rows.length })}
            </Button>
          </Space>
        </>
      )}

      {/* Step 2 – Assign to Warehouses */}
      {current === 2 && (
        <>
          <Text type="secondary">
            <Tag color="success">{t('wizards.onboard_product.products_created_tag', { count: createdProducts.length })}</Tag>
            {t('wizards.onboard_product.assign_now_hint')}
          </Text>
          <Divider />
          <Form.Item label={t('wizards.onboard_product.assign_warehouses_label')}>
            <Select
              mode="multiple"
              placeholder={t('wizards.onboard_product.select_warehouses')}
              style={{ width: '100%' }}
              value={selectedWarehouseIds}
              onChange={setSelectedWarehouseIds}
            >
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>
                  {w.title}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({w.products?.length ?? 0} products)
                  </Text>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Space>
            <Button onClick={() => assignMutation.mutate([])}>{t('wizards.onboard_product.skip_assign')}</Button>
            <Button type="primary" onClick={handleStep2to3} loading={assignMutation.isPending}
              disabled={selectedWarehouseIds.length === 0}>
              {t('wizards.onboard_product.assign_btn', { count: selectedWarehouseIds.length || 0 })}
            </Button>
          </Space>
        </>
      )}

      {/* Step 3 – Done */}
      {current === 3 && (
        <Result
          status="success"
          title={t('wizards.onboard_product.products_onboarded_title', { count: createdProducts.length })}
          extra={[<Button type="primary" key="new" onClick={reset}>{t('wizards.onboard_product.add_more')}</Button>]}
        >
          <Row gutter={8} style={{ flexWrap: 'wrap', gap: 8 }}>
            {createdProducts.map(p => (
              <Tag key={p.id} color="blue" style={{ marginBottom: 4 }}>
                {p.name} — qty: {p.quantity}
              </Tag>
            ))}
          </Row>
        </Result>
      )}
    </Card>
  );
};

export default OnboardProductWizard;
