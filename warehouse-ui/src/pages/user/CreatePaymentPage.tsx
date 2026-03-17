import React, { useState } from 'react';
import { Form, Select, Button, InputNumber, Typography, Card, message, Tag } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { filterInvoices } from '../../api/invoices';
import { getShops } from '../../api/shops';
import { createPayment } from '../../api/payments';
import type { PaymentRequest, Shop, Invoice } from '../../types';
import { paymentMethodOptions, formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';

const CreatePaymentPage: React.FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-for-payment', selectedShopId, user?.id],
    queryFn: () => filterInvoices({ shopId: selectedShopId!, userId: user!.id }),
    enabled: !!selectedShopId && !!user?.id,
  });

  const unpaidInvoices = invoices.filter((i: Invoice) => !i.paid && !i.free);

  const mutation = useMutation({
    mutationFn: (data: PaymentRequest) => createPayment(data),
    onSuccess: () => {
      message.success(t('payments.payment_recorded'));
      form.resetFields();
      setSelectedShopId(null);
    },
  });

  const handleShopChange = (shopId: number) => {
    setSelectedShopId(shopId);
    form.setFieldValue('invoiceId', undefined);
  };

  return (
    <>
      <Typography.Title level={4}>{t('payments.record_shop_payment')}</Typography.Title>
      <Card style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical" onFinish={mutation.mutate}>
          <Form.Item name="shopId" label={t('common.shop')} rules={[{ required: true }]}>
            <Select
              placeholder={t('common.shop')}
              showSearch
              optionFilterProp="label"
              onChange={handleShopChange}
            >
              {shops.filter((s: Shop) => !s.test).map((s: Shop) => (
                <Select.Option key={s.id} value={s.id} label={s.title}>{s.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="invoiceId" label={t('common.invoice')} rules={[{ required: true }]}>
            <Select
              placeholder={selectedShopId ? t('payments.select_invoice') : t('payments.select_shop_first')}
              disabled={!selectedShopId}
              loading={invoicesLoading}
              showSearch
              optionFilterProp="label"
            >
              {unpaidInvoices.map((i: Invoice) => {
                const paid = i.payments.reduce((s, p) => s + p.amount, 0);
                const remaining = i.totalPrice - paid;
                return (
                  <Select.Option key={i.id} value={i.id} label={`#${i.id}`}>
                    <span>#{i.id}</span>
                    <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>
                      {formatCurrency(remaining)}
                    </Tag>
                  </Select.Option>
                );
              })}
              {selectedShopId && !invoicesLoading && unpaidInvoices.length === 0 && (
                <Select.Option disabled value="">
                  {t('payments.no_unpaid_invoices')}
                </Select.Option>
              )}
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
            <Button type="primary" htmlType="submit" loading={mutation.isPending} block>
              {t('payments.record_payment')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default CreatePaymentPage;
