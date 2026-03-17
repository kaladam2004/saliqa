import React from 'react';
import { Form, Select, Button, InputNumber, Typography, Card, message } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getUserInvoices } from '../../api/userInvoices';
import { createUserPayment } from '../../api/userPayments';
import type { UserPaymentRequest } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { paymentMethodOptions } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const UserPaymentPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: userInvoices = [] } = useQuery({ queryKey: ['user-invoices'], queryFn: getUserInvoices });

  const mutation = useMutation({
    mutationFn: (data: UserPaymentRequest) => createUserPayment(data),
    onSuccess: () => { message.success(t('payments.payment_submitted')); form.resetFields(); },
  });

  const handleSubmit = (values: Omit<UserPaymentRequest, 'userId'>) => {
    mutation.mutate({ ...values, userId: user!.id });
  };

  return (
    <>
      <Typography.Title level={4}>{t('payments.submit_to_admin')}</Typography.Title>
      <Card style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="userInvoiceId" label={t('payments.related_wh_invoice')}>
            <Select placeholder={t('common.invoice')} allowClear>
              {userInvoices.map(ui => <Select.Option key={ui.id} value={ui.id}>Invoice #{ui.id} - {ui.warehouse?.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label={t('common.amount')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="paymentMethod" label={t('payments.payment_method')} rules={[{ required: true }]}>
            <Select options={paymentMethodOptions} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Select.Option value="">-</Select.Option>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} block>{t('payments.submit_btn')}</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default UserPaymentPage;
