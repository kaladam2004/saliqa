import React, { useState } from 'react';
import {
  Steps, Card, Select, Button, InputNumber, Typography,
  Result, Alert, Space, Row, Col, Statistic, Divider, message,
} from 'antd';
import { UserOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers } from '../../../api/users';
import { getUnpaidUserInvoicesByUser } from '../../../api/userInvoices';
import { bulkAcceptPayment } from '../../../api/userPayments';
import type { User, UserInvoice, PaymentMethod, BulkUserPaymentResponse } from '../../../types';
import { formatCurrency, paymentMethodOptions } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const getRemaining = (invoice: UserInvoice) => {
  const paid = invoice.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  return Math.max(0, (invoice.totalPrice ?? 0) - paid);
};

const AcceptPaymentWizard: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<BulkUserPaymentResponse | null>(null);

  const STEPS = [
    { title: t('wizards.accept_payment.step_select_rep'), icon: <UserOutlined /> },
    { title: t('wizards.accept_payment.step_payment_details'), icon: <DollarOutlined /> },
    { title: t('wizards.accept_payment.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const { data: unpaidInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['unpaid-user-invoices', selectedUserId],
    queryFn: () => getUnpaidUserInvoicesByUser(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const totalDebt = unpaidInvoices.reduce((sum: number, i: UserInvoice) => sum + getRemaining(i), 0);

  const submitMutation = useMutation({
    mutationFn: () => bulkAcceptPayment({
      userId: selectedUserId!,
      amount,
      paymentMethod: method,
      description: description || undefined,
    }),
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['unpaid-user-invoices', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-payments-admin'] });
      queryClient.invalidateQueries({ queryKey: ['user-invoices'] });
      setCurrent(2);
    },
    onError: () => message.error(t('wizards.accept_payment.error')),
  });

  const reset = () => {
    setCurrent(0);
    setSelectedUserId(null);
    setSelectedUser(null);
    setAmount(0);
    setMethod('CASH');
    setDescription('');
    setResult(null);
  };

  return (
    <Card style={{ maxWidth: 600 }}>
      <Title level={4}>{t('wizards.accept_payment.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0: Select Rep */}
      {current === 0 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Text type="secondary">{t('wizards.accept_payment.select_rep_hint')}</Text>
          <Select
            showSearch optionFilterProp="label"
            placeholder={t('common.sales_rep')}
            style={{ width: '100%' }}
            size="large"
            value={selectedUserId ?? undefined}
            onChange={(id: number) => {
              setSelectedUserId(id);
              setSelectedUser(users.find((u: User) => u.id === id) ?? null);
            }}
          >
            {users.map((u: User) => (
              <Select.Option key={u.id} value={u.id} label={u.fullname}>{u.fullname}</Select.Option>
            ))}
          </Select>

          {selectedUserId && !invoicesLoading && (
            <Card size="small" style={{ background: '#fff7e6' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title={t('wizards.accept_payment.unpaid_invoices')} value={unpaidInvoices.length} />
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

          {selectedUserId && !invoicesLoading && unpaidInvoices.length === 0 && (
            <Alert message={t('wizards.accept_payment.no_unpaid_invoices')} type="success" showIcon />
          )}

          <Button
            type="primary" size="large"
            disabled={!selectedUserId || invoicesLoading || unpaidInvoices.length === 0}
            onClick={() => { setAmount(totalDebt); setCurrent(1); }}
          >
            {t('common.next')}
          </Button>
        </Space>
      )}

      {/* Step 1: Amount & Method */}
      {current === 1 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            message={t('wizards.accept_payment.reviewing_for', { name: selectedUser?.fullname })}
            type="info" showIcon
          />
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title={t('wizards.accept_payment.unpaid_invoices')} value={unpaidInvoices.length} />
            </Col>
            <Col span={12}>
              <Statistic title={t('wizards.bulk_collect.total_debt')} value={formatCurrency(totalDebt)}
                valueStyle={{ color: '#cf1322', fontSize: 14 }} />
            </Col>
          </Row>
          <Divider />
          <div>
            <Text strong>{t('common.amount')}</Text>
            <InputNumber
              value={amount}
              min={0}
              style={{ width: '100%', marginTop: 6 }}
              size="large"
              precision={2}
              onChange={v => setAmount(v ?? 0)}
              addonAfter="сом"
            />
            <Space style={{ marginTop: 6 }}>
              <Button size="small" onClick={() => setAmount(totalDebt)}>
                {t('wizards.collect_payment.full_amount')}
              </Button>
              <Button size="small" onClick={() => setAmount(Math.round(totalDebt / 2))}>
                {t('wizards.collect_payment.half')}
              </Button>
            </Space>
          </div>
          <div>
            <Text strong>{t('payments.payment_method')}</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              size="large"
              value={method}
              options={paymentMethodOptions}
              onChange={v => setMethod(v as PaymentMethod)}
            />
          </div>
          <div>
            <Text strong>{t('common.description')}</Text>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('common.description')}
              style={{ width: '100%', padding: '7px 11px', border: '1px solid #d9d9d9', borderRadius: 6, marginTop: 6 }}
            />
          </div>
          <Space>
            <Button onClick={() => setCurrent(0)}>{t('common.back')}</Button>
            <Button type="primary" size="large" loading={submitMutation.isPending} disabled={!amount}
              onClick={() => submitMutation.mutate()}>
              {amount > 0
                ? `${t('wizards.accept_payment.confirm_payment')} — ${formatCurrency(amount)}`
                : t('wizards.accept_payment.confirm_payment')}
            </Button>
          </Space>
        </Space>
      )}

      {/* Step 2: Done */}
      {current === 2 && result && (
        <Result
          status="success"
          title={t('wizards.accept_payment.success_title')}
          subTitle={t('wizards.accept_payment.success_sub', {
            name: selectedUser?.fullname,
            count: result.invoicesClosed,
            amount: formatCurrency(result.totalApplied),
          })}
          extra={[
            <Button type="primary" key="new" onClick={reset}>
              {t('wizards.accept_payment.accept_another')}
            </Button>,
          ]}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title={t('wizards.accept_payment.invoices_closed')} value={result.invoicesClosed} />
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

export default AcceptPaymentWizard;
