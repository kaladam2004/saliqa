import React, { useState } from 'react';
import {
  Steps, Form, Input, Button, Card, Transfer, Typography,
  Result, Descriptions, Tag, Space, message,
} from 'antd';
import { BankOutlined, AppstoreOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createWarehouse } from '../../../api/warehouses';
import { getProducts, addToWarehouse } from '../../../api/products';
import type { Warehouse, WarehouseRequest } from '../../../types';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const SetupWarehouseWizard: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm<WarehouseRequest>();
  const [createdWarehouse, setCreatedWarehouse] = useState<Warehouse | null>(null);
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const STEPS = [
    { title: t('wizards.setup_warehouse.step_info'), icon: <BankOutlined /> },
    { title: t('wizards.setup_warehouse.step_assign_products'), icon: <AppstoreOutlined /> },
    { title: t('wizards.setup_warehouse.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const createMutation = useMutation({
    mutationFn: (data: WarehouseRequest) => createWarehouse(data),
    onSuccess: (warehouse) => {
      setCreatedWarehouse(warehouse);
      setCurrent(1);
    },
    onError: () => message.error(t('wizards.setup_warehouse.error_create')),
  });

  const assignMutation = useMutation({
    mutationFn: (productIds: number[]) => addToWarehouse(createdWarehouse!.id, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setCurrent(2);
    },
    onError: () => message.error(t('wizards.setup_warehouse.error_assign')),
  });

  const handleStep0 = async () => {
    const values = await form.validateFields();
    createMutation.mutate(values);
  };

  const handleStep1 = () => {
    if (selectedProductKeys.length === 0) {
      message.warning(t('wizards.setup_warehouse.select_one_product'));
    }
    const ids = selectedProductKeys.map(Number);
    assignMutation.mutate(ids);
  };

  const reset = () => {
    setCurrent(0);
    form.resetFields();
    setCreatedWarehouse(null);
    setSelectedProductKeys([]);
  };

  const transferData = products.map(p => ({
    key: String(p.id),
    title: p.name,
    description: `Stock: ${p.quantity} | Price: ${p.price?.toLocaleString()}`,
  }));

  return (
    <Card style={{ maxWidth: 760 }}>
      <Title level={4}>{t('wizards.setup_warehouse.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0 – Warehouse Details */}
      {current === 0 && (
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('wizards.setup_warehouse.warehouse_name')} rules={[{ required: true, message: t('wizards.setup_warehouse.required') }]}>
            <Input placeholder={t('wizards.setup_warehouse.warehouse_name_placeholder')} />
          </Form.Item>
          <Form.Item name="responsiblePerson" label={t('wizards.setup_warehouse.responsible_person')}>
            <Input placeholder={t('wizards.setup_warehouse.responsible_placeholder')} />
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}>
            <Input placeholder={t('wizards.setup_warehouse.phone_placeholder')} />
          </Form.Item>
          <Form.Item name="gps" label={t('common.gps')}>
            <Input placeholder={t('wizards.setup_warehouse.gps_placeholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleStep0} loading={createMutation.isPending} size="large">
              {t('wizards.setup_warehouse.create_continue')}
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* Step 1 – Assign Products */}
      {current === 1 && (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('wizards.setup_warehouse.assign_hint', { name: createdWarehouse?.title })}
          </Text>
          <Transfer
            dataSource={transferData}
            titles={[t('wizards.setup_warehouse.all_products'), t('wizards.setup_warehouse.in_warehouse')]}
            targetKeys={selectedProductKeys}
            onChange={(keys) => setSelectedProductKeys(keys as string[])}
            render={item => (
              <span>
                <strong>{item.title}</strong>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{item.description}</Text>
              </span>
            )}
            listStyle={{ width: 300, height: 350 }}
            showSearch
          />
          <Space style={{ marginTop: 24 }}>
            <Button onClick={() => { assignMutation.mutate([]); }}>
              {t('wizards.setup_warehouse.skip_assign')}
            </Button>
            <Button type="primary" onClick={handleStep1} loading={assignMutation.isPending}
              disabled={selectedProductKeys.length === 0}>
              {selectedProductKeys.length > 0
                ? t('wizards.setup_warehouse.assign_products_btn', { count: selectedProductKeys.length })
                : t('wizards.setup_warehouse.assign_btn_default')}
            </Button>
          </Space>
        </>
      )}

      {/* Step 2 – Done */}
      {current === 2 && (
        <Result
          status="success"
          title={t('wizards.setup_warehouse.warehouse_created_title')}
          subTitle={t('wizards.setup_warehouse.warehouse_ready_sub', { name: createdWarehouse?.title })}
          extra={[
            <Button type="primary" key="new" onClick={reset}>{t('wizards.setup_warehouse.create_another')}</Button>,
          ]}
        >
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label={t('wizards.setup_warehouse.name_label')}>{createdWarehouse?.title}</Descriptions.Item>
            <Descriptions.Item label={t('wizards.setup_warehouse.responsible_label')}>{createdWarehouse?.responsiblePerson || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('common.tel')}>{createdWarehouse?.tel || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('common.gps')}>{createdWarehouse?.gps || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('wizards.setup_warehouse.products_assigned')}>
              <Tag color="blue">{selectedProductKeys.length}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Result>
      )}
    </Card>
  );
};

export default SetupWarehouseWizard;
