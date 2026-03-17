import React from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag } from 'antd';
import {
  ShopOutlined, UserOutlined, AppstoreOutlined, BankOutlined,
  DollarOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getWarehouses } from '../../api/warehouses';
import { getUsers } from '../../api/users';
import { getProducts } from '../../api/products';
import { getShops } from '../../api/shops';
import { getInvoices } from '../../api/invoices';
import { getEventLogs } from '../../api/eventLogs';
import { formatDateTime } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const { data: logs = [] } = useQuery({ queryKey: ['event-logs'], queryFn: getEventLogs });

  const unpaidInvoices = invoices.filter(i => !i.paid).length;

  return (
    <>
      <Typography.Title level={4}>{t('dashboard.welcome', { name: user?.fullname })}</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title={t('dashboard.warehouses')} value={warehouses.length} prefix={<BankOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title={t('dashboard.users')} value={users.length} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title={t('dashboard.products')} value={products.length} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title={t('dashboard.shops')} value={shops.length} prefix={<ShopOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title={t('dashboard.invoices')} value={invoices.length} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title={t('dashboard.unpaid')} value={unpaidInvoices} prefix={<DollarOutlined />} valueStyle={{ color: unpaidInvoices > 0 ? '#cf1322' : '#3f8600' }} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title={t('dashboard.recent_events')} style={{ height: 400, overflow: 'auto' }}>
            <List size="small" dataSource={logs.slice(0, 20)} renderItem={log => (
              <List.Item>
                <List.Item.Meta
                  title={<><Tag color="blue">{log.eventType}</Tag> {log.description}</>}
                  description={`${log.actorUsername} - ${formatDateTime(log.timestamp)}`}
                />
              </List.Item>
            )} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('dashboard.low_stock')} style={{ height: 400, overflow: 'auto' }}>
            <List size="small"
              dataSource={products.filter(p => p.quantity < 10).sort((a, b) => a.quantity - b.quantity).slice(0, 20)}
              renderItem={p => (
                <List.Item extra={<Tag color={p.quantity === 0 ? 'red' : 'orange'}>{t('common.units', { count: p.quantity })}</Tag>}>
                  {p.name}
                </List.Item>
              )} />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default AdminDashboard;
