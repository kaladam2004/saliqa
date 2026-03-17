import React from 'react';
import { Form, Select, Button, InputNumber, Typography, Card, message } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getWarehouses } from '../../api/warehouses';
import { getProducts } from '../../api/products';
import { getUserInvoices } from '../../api/userInvoices';
import { createUserReturn } from '../../api/userReturns';
import type { UserReturnRequest } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const UserReturnPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: userInvoices = [] } = useQuery({ queryKey: ['user-invoices'], queryFn: getUserInvoices });

  const mutation = useMutation({
    mutationFn: (data: UserReturnRequest) => createUserReturn(data),
    onSuccess: () => { message.success(t('returns.return_to_wh_created')); form.resetFields(); },
  });

  const handleSubmit = (values: Omit<UserReturnRequest, 'userId'>) => {
    mutation.mutate({ ...values, userId: user!.id });
  };

  return (
    <>
      <Typography.Title level={4}>{t('returns.return_to_wh')}</Typography.Title>
      <Card style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="warehouseId" label={t('common.warehouse')} rules={[{ required: true }]}>
            <Select placeholder={t('common.warehouse')}>
              {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="productId" label={t('common.product')} rules={[{ required: true }]}>
            <Select placeholder={t('common.product')}>
              {products.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label={t('common.quantity')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="userInvoiceId" label={t('returns.related_invoice')}>
            <Select placeholder={t('common.invoice')} allowClear>
              {userInvoices.map(ui => <Select.Option key={ui.id} value={ui.id}>Invoice #{ui.id} - {ui.warehouse?.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Select.Option value="">-</Select.Option>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} block>{t('returns.return_to_wh_btn')}</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default UserReturnPage;
