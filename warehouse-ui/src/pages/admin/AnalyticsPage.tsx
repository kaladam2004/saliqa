import React from 'react';
import { Card, Col, Row, Statistic, Typography, Divider, Spin } from 'antd';
import {
  DollarOutlined, ShoppingCartOutlined, FileTextOutlined,
  WarningOutlined, BankOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceStats } from '../../api/admins';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: getInvoiceStats,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 60 }} />;

  return (
    <>
      <Typography.Title level={4}>{t('analytics.title')}</Typography.Title>

      {/* Money stats */}
      <Typography.Title level={5} type="secondary" style={{ marginBottom: 12 }}>
        {t('analytics.financial')}
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t('analytics.total_delivered')}
              value={stats?.totalDelivered}
              formatter={v => formatCurrency(Number(v))}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t('analytics.total_collected')}
              value={stats?.totalCollected}
              formatter={v => formatCurrency(Number(v))}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title={t('analytics.total_debt')}
              value={stats?.totalDebt}
              formatter={v => formatCurrency(Number(v))}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Debt formula */}
      <Card style={{ marginTop: 16, background: '#fafafa' }}>
        <Typography.Title level={5}>{t('analytics.debt_formula')}</Typography.Title>
        <Typography.Paragraph>
          <Typography.Text strong style={{ color: '#1677ff' }}>
            {formatCurrency(stats?.totalDelivered || 0)}
          </Typography.Text>
          {' '}{t('analytics.delivered_to_shops')}{' '}
          <Typography.Text strong>−</Typography.Text>
          {' '}
          <Typography.Text strong style={{ color: '#52c41a' }}>
            {formatCurrency(stats?.totalCollected || 0)}
          </Typography.Text>
          {' '}{t('analytics.payments_received')}{' '}
          <Typography.Text strong>=</Typography.Text>
          {' '}
          <Typography.Text strong style={{ color: '#ff4d4f' }}>
            {formatCurrency(stats?.totalDebt || 0)}
          </Typography.Text>
          {' '}{t('analytics.total_debt_label')}
        </Typography.Paragraph>
      </Card>

      <Divider />

      {/* Invoice stats */}
      <Typography.Title level={5} type="secondary" style={{ marginBottom: 12 }}>
        {t('analytics.invoices')}
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('analytics.total_invoices')} value={stats?.totalInvoices} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('analytics.paid_invoices')}
              value={stats?.paidInvoices}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('analytics.unpaid_invoices')}
              value={stats?.unpaidInvoices}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Warehouse/product stats */}
      <Typography.Title level={5} type="secondary" style={{ marginBottom: 12 }}>
        {t('analytics.warehouse')}
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('analytics.stock_value')}
              value={stats?.warehouseStockValue}
              formatter={v => formatCurrency(Number(v))}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title={t('analytics.total_pickups')} value={stats?.totalProductPickups} suffix={t('analytics.units_picked_up')} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title={t('analytics.total_delivered_qty')} value={stats?.totalProductDelivered} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title={t('analytics.total_returned_qty')} value={stats?.totalProductReturned} />
          </Card>
        </Col>
      </Row>

      {/* Warehouse balance formula */}
      <Card style={{ marginTop: 16, background: '#fafafa' }}>
        <Typography.Title level={5}>{t('analytics.warehouse_formula')}</Typography.Title>
        <Typography.Paragraph>
          <Typography.Text strong style={{ color: '#1677ff' }}>
            {stats?.totalProductPickups} {t('analytics.units_picked_up')}
          </Typography.Text>
          {' '}
          <Typography.Text strong>−</Typography.Text>
          {' '}
          <Typography.Text strong style={{ color: '#faad14' }}>
            {stats?.totalProductDelivered} {t('analytics.units_delivered')}
          </Typography.Text>
          {' '}
          <Typography.Text strong>−</Typography.Text>
          {' '}
          <Typography.Text strong style={{ color: '#52c41a' }}>
            {stats?.totalProductReturned} {t('analytics.units_returned')}
          </Typography.Text>
          {' '}
          <Typography.Text strong>=</Typography.Text>
          {' '}
          <Typography.Text strong style={{ color: '#1677ff' }}>
            {(stats?.totalProductPickups || 0) - (stats?.totalProductDelivered || 0) - (stats?.totalProductReturned || 0)} {t('analytics.units_with_reps')}
          </Typography.Text>
        </Typography.Paragraph>
      </Card>
    </>
  );
};

export default AnalyticsPage;
