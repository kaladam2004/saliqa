import React, { useState } from 'react';
import {
  Steps, Select, Button, Card, InputNumber, Typography,
  Result, Tag, Space, Alert, Statistic, Row, Col, Divider, message,
} from 'antd';
import { ShopOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getShops } from '../../../api/shops';
import { getInvoices } from '../../../api/invoices';
import { createPayment } from '../../../api/payments';
import type { Shop, Invoice, Payment, PaymentMethod } from '../../../types';
import { formatCurrency, formatDateTime, paymentMethodOptions } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const CollectPaymentWizard: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);

  const STEPS = [
    { title: t('wizards.collect_payment.step_shop_invoice'), icon: <ShopOutlined /> },
    { title: t('wizards.collect_payment.step_payment_details'), icon: <DollarOutlined /> },
    { title: t('wizards.collect_payment.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });

  const shopInvoices = allInvoices.filter(
    (i: Invoice) => i.shop?.id === selectedShop?.id && !i.paid
  );

  const alreadyPaid = selectedInvoice
    ? selectedInvoice.payments?.reduce((s, p) => s + p.amount, 0) ?? 0
    : 0;
  const remaining = selectedInvoice
    ? Math.max(0, (selectedInvoice.totalPrice ?? 0) - alreadyPaid)
    : 0;

  const mutation = useMutation({
    mutationFn: () => createPayment({
      invoiceId: selectedInvoice!.id,
      shopId: selectedShop!.id,
      amount,
      paymentMethod: method,
      description,
    }),
    onSuccess: (payment) => { setCreatedPayment(payment); setCurrent(2); },
    onError: () => message.error(t('wizards.collect_payment.error_record')),
  });

  const handleNext0 = () => {
    if (!selectedShop) { message.error(t('wizards.collect_payment.error_select_shop')); return; }
    if (!selectedInvoice) { message.error(t('wizards.collect_payment.error_select_invoice')); return; }
    setAmount(remaining);
    setCurrent(1);
  };

  const reset = () => {
    setCurrent(0);
    setSelectedShop(null);
    setSelectedInvoice(null);
    setAmount(0);
    setMethod('CASH');
    setDescription('');
    setCreatedPayment(null);
  };

  return (
    <Card style={{ maxWidth: 600 }}>
      <Title level={4}>{t('wizards.collect_payment.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* ── Step 0: Shop & Invoice ────────────────────────────────────────── */}
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
              onChange={id => {
                setSelectedShop(shops.find((s: Shop) => s.id === id) ?? null);
                setSelectedInvoice(null);
              }}
            >
              {shops.filter((s: Shop) => !s.test).map((s: Shop) => (
                <Select.Option key={s.id} value={s.id} label={s.title}>{s.title}</Select.Option>
              ))}
            </Select>
          </div>

          {selectedShop && (
            <div>
              <Text strong>{t('wizards.collect_payment.unpaid_invoice')}</Text>
              {shopInvoices.length === 0 ? (
                <Alert message={t('wizards.collect_payment.no_unpaid_invoices')} type="info" showIcon style={{ marginTop: 6 }} />
              ) : (
                <Select
                  placeholder={t('wizards.collect_payment.select_invoice')}
                  style={{ width: '100%', marginTop: 6 }}
                  size="large"
                  value={selectedInvoice?.id}
                  onChange={id => setSelectedInvoice(allInvoices.find((i: Invoice) => i.id === id) ?? null)}
                >
                  {shopInvoices.map((i: Invoice) => (
                    <Select.Option key={i.id} value={i.id}>
                      Invoice #{i.id} — {formatCurrency(i.totalPrice)} — {formatDateTime(i.date)}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </div>
          )}

          {selectedInvoice && (
            <Card size="small" style={{ background: '#fffbe6' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title={t('wizards.collect_payment.invoice_total')} value={formatCurrency(selectedInvoice.totalPrice)} valueStyle={{ fontSize: 14 }} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('wizards.collect_payment.remaining')} value={formatCurrency(remaining)} valueStyle={{ fontSize: 14, color: remaining > 0 ? '#cf1322' : '#52c41a' }} />
                </Col>
              </Row>
            </Card>
          )}

          <Button type="primary" size="large" onClick={handleNext0}
            disabled={!selectedShop || !selectedInvoice}>
            {t('wizards.collect_payment.continue_to_payment')}
          </Button>
        </Space>
      )}

      {/* ── Step 1: Amount & Method ───────────────────────────────────────── */}
      {current === 1 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            message={<>{t('wizards.collect_payment.collecting_from', { shop: selectedShop?.title, id: selectedInvoice?.id })}</>}
            type="info" showIcon
          />
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title={t('wizards.collect_payment.invoice_total')} value={formatCurrency(selectedInvoice?.totalPrice)} />
            </Col>
            <Col span={12}>
              <Statistic title={t('wizards.collect_payment.remaining_balance')} value={formatCurrency(remaining)}
                valueStyle={{ color: '#cf1322' }} />
            </Col>
          </Row>
          <Divider />
          <div>
            <Text strong>{t('wizards.collect_payment.amount_received')}</Text>
            <InputNumber
              value={amount}
              min={1}
              max={remaining || undefined}
              style={{ width: '100%', marginTop: 6 }}
              size="large"
              onChange={v => setAmount(v ?? 0)}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
            <Space style={{ marginTop: 6 }}>
              <Tag style={{ cursor: 'pointer' }} onClick={() => setAmount(remaining)}>{t('wizards.collect_payment.full_amount')}</Tag>
              <Tag style={{ cursor: 'pointer' }} onClick={() => setAmount(Math.round(remaining / 2))}>{t('wizards.collect_payment.half')}</Tag>
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
            <Button type="primary" size="large" onClick={() => mutation.mutate()}
              loading={mutation.isPending} disabled={!amount}>
              {amount > 0
                ? t('wizards.collect_payment.record_payment_amount', { amount: formatCurrency(amount) })
                : t('wizards.collect_payment.record_payment_btn')}
            </Button>
          </Space>
        </Space>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────── */}
      {current === 2 && (
        <Result
          status="success"
          title={t('wizards.collect_payment.payment_recorded_title')}
          subTitle={t('wizards.collect_payment.payment_subtitle', { amount: formatCurrency(createdPayment?.amount ?? 0), shop: selectedShop?.title })}
          extra={[<Button type="primary" key="new" onClick={reset}>{t('wizards.collect_payment.collect_another')}</Button>]}
        >
          <Row gutter={16}>
            <Col span={8}><Statistic title={t('wizards.collect_payment.amount_label')} value={formatCurrency(createdPayment?.amount ?? 0)} /></Col>
            <Col span={8}><Statistic title={t('wizards.collect_payment.method_label')} value={createdPayment?.paymentMethod} /></Col>
            <Col span={8}><Statistic title={t('wizards.collect_payment.invoice_hash')} value={selectedInvoice?.id} /></Col>
          </Row>
          {(createdPayment?.change ?? 0) > 0 && (
            <Alert
              style={{ marginTop: 16 }}
              type="warning"
              showIcon
              message={t('payments.change_to_return', { amount: formatCurrency(createdPayment!.change!) })}
            />
          )}
        </Result>
      )}
    </Card>
  );
};

export default CollectPaymentWizard;
