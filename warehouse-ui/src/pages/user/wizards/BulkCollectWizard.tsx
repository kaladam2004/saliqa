import React, { useState } from 'react';
import {
  Steps, Card, Select, Button, InputNumber, Typography,
  Result, Alert, Space, Row, Col, Statistic, Divider, message,
} from 'antd';
import { ShopOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getShops } from '../../../api/shops';
import { getInvoices } from '../../../api/invoices';
import { bulkCollectPayment } from '../../../api/payments';
import type { Shop, Invoice, PaymentMethod, BulkPaymentResponse } from '../../../types';
import { formatCurrency, paymentMethodOptions } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const BulkCollectWizard: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<BulkPaymentResponse | null>(null);

  const STEPS = [
    { title: t('wizards.bulk_collect.step_select_shop'), icon: <ShopOutlined /> },
    { title: t('wizards.bulk_collect.step_payment'), icon: <DollarOutlined /> },
    { title: t('wizards.bulk_collect.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });

  const shopUnpaidInvoices = allInvoices.filter(
    (i: Invoice) => i.shop?.id === selectedShop?.id && !i.paid
  );

  const totalDebt = shopUnpaidInvoices.reduce((sum: number, i: Invoice) => {
    const paid = i.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
    return sum + Math.max(0, (i.totalPrice ?? 0) - paid);
  }, 0);

  const mutation = useMutation({
    mutationFn: () => bulkCollectPayment({
      shopId: selectedShop!.id,
      amount,
      paymentMethod: method,
      description: description || undefined,
    }),
    onSuccess: (res) => { setResult(res); setCurrent(2); },
    onError: () => message.error(t('wizards.bulk_collect.error')),
  });

  const reset = () => {
    setCurrent(0);
    setSelectedShop(null);
    setAmount(0);
    setMethod('CASH');
    setDescription('');
    setResult(null);
  };

  return (
    <Card style={{ maxWidth: 600 }}>
      <Title level={4}>{t('wizards.bulk_collect.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0: Select shop */}
      {current === 0 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Text strong>{t('wizards.collect_payment.shop_label')}</Text>
            <Select
              showSearch optionFilterProp="label"
              placeholder={t('wizards.collect_payment.select_shop')}
              style={{ width: '100%', marginTop: 6 }}
              size="large"
              value={selectedShop?.id}
              onChange={id => setSelectedShop(shops.find((s: Shop) => s.id === id) ?? null)}
            >
              {shops.filter((s: Shop) => !s.test).map((s: Shop) => (
                <Select.Option key={s.id} value={s.id} label={s.title}>{s.title}</Select.Option>
              ))}
            </Select>
          </div>

          {selectedShop && (
            <Card size="small" style={{ background: '#fff7e6' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title={t('wizards.bulk_collect.unpaid_invoices')}
                    value={shopUnpaidInvoices.length}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t('wizards.bulk_collect.total_debt')}
                    value={formatCurrency(totalDebt)}
                    valueStyle={{ color: totalDebt > 0 ? '#cf1322' : '#52c41a', fontSize: 14 }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Button
            type="primary" size="large"
            disabled={!selectedShop || shopUnpaidInvoices.length === 0}
            onClick={() => { setAmount(totalDebt); setCurrent(1); }}
          >
            {t('common.next')}
          </Button>
          {selectedShop && shopUnpaidInvoices.length === 0 && (
            <Alert message={t('wizards.collect_payment.no_unpaid_invoices')} type="success" showIcon />
          )}
        </Space>
      )}

      {/* Step 1: Amount & method */}
      {current === 1 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            message={t('wizards.bulk_collect.collecting_from', { shop: selectedShop?.title, count: shopUnpaidInvoices.length })}
            type="info" showIcon
          />
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title={t('wizards.bulk_collect.unpaid_invoices')} value={shopUnpaidInvoices.length} />
            </Col>
            <Col span={12}>
              <Statistic title={t('wizards.bulk_collect.total_debt')} value={formatCurrency(totalDebt)}
                valueStyle={{ color: '#cf1322', fontSize: 14 }} />
            </Col>
          </Row>
          <Divider />
          <div>
            <Text strong>{t('wizards.collect_payment.amount_received')}</Text>
            <InputNumber
              value={amount}
              min={1}
              style={{ width: '100%', marginTop: 6 }}
              size="large"
              onChange={v => setAmount(v ?? 0)}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
            <Space style={{ marginTop: 6 }}>
              <Button size="small" onClick={() => setAmount(totalDebt)}>{t('wizards.collect_payment.full_amount')}</Button>
              <Button size="small" onClick={() => setAmount(Math.round(totalDebt / 2))}>{t('wizards.collect_payment.half')}</Button>
            </Space>
          </div>
          <div>
            <Text strong>{t('wizards.collect_payment.payment_method')}</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              size="large"
              value={method}
              options={paymentMethodOptions}
              onChange={v => setMethod(v as PaymentMethod)}
            />
          </div>
          <div>
            <Text strong>{t('wizards.collect_payment.notes_optional')}</Text>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('wizards.collect_payment.notes_placeholder')}
              style={{ width: '100%', padding: '7px 11px', border: '1px solid #d9d9d9', borderRadius: 6, marginTop: 6 }}
            />
          </div>
          <Space>
            <Button onClick={() => setCurrent(0)}>{t('common.back')}</Button>
            <Button type="primary" size="large" loading={mutation.isPending} disabled={!amount}
              onClick={() => mutation.mutate()}>
              {amount > 0
                ? t('wizards.bulk_collect.confirm_btn', { amount: formatCurrency(amount) })
                : t('wizards.bulk_collect.confirm_btn_default')}
            </Button>
          </Space>
        </Space>
      )}

      {/* Step 2: Done */}
      {current === 2 && result && (
        <Result
          status="success"
          title={t('wizards.bulk_collect.success_title')}
          subTitle={t('wizards.bulk_collect.success_sub', {
            shop: selectedShop?.title,
            count: result.invoicesClosed,
            amount: formatCurrency(result.totalApplied),
          })}
          extra={[<Button type="primary" key="new" onClick={reset}>{t('wizards.bulk_collect.collect_another')}</Button>]}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title={t('wizards.bulk_collect.invoices_closed')} value={result.invoicesClosed} />
            </Col>
            <Col span={8}>
              <Statistic title={t('common.amount')} value={formatCurrency(result.totalApplied)} />
            </Col>
            <Col span={8}>
              <Statistic title={t('wizards.bulk_collect.not_applied')} value={formatCurrency(result.change)}
                valueStyle={{ color: result.change > 0 ? '#cf1322' : undefined }} />
            </Col>
          </Row>
          {result.change > 0 && (
            <Alert style={{ marginTop: 16 }} type="warning" showIcon
              message={t('payments.change_to_return', { amount: formatCurrency(result.change) })} />
          )}
        </Result>
      )}
    </Card>
  );
};

export default BulkCollectWizard;
