import React from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag } from 'antd';
import { ShopOutlined, FileTextOutlined, DollarOutlined, InboxOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getShops } from '../../api/shops';
import { getInvoices } from '../../api/invoices';
import { getUserInvoices } from '../../api/userInvoices';
import { getUserPayments } from '../../api/userPayments';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const UserDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const userId = user?.id;

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const { data: userInvoices = [] } = useQuery({ queryKey: ['user-invoices'], queryFn: getUserInvoices });
  const { data: userPayments = [] } = useQuery({ queryKey: ['user-payments'], queryFn: getUserPayments });

  const myShops = shops.filter(s => s.shopkeeper?.id === userId);
  const myInvoices = invoices.filter(i => i.user?.id === userId);
  const myUserInvoices = userInvoices.filter(ui => ui.user?.id === userId);
  const myPayments = userPayments.filter(p => p.user?.id === userId);
  const totalCollected = myPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <Typography.Title level={4}>{t('dashboard.welcome', { name: user?.fullname })}</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card><Statistic title={t('dashboard.my_shops')} value={myShops.length} prefix={<ShopOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title={t('dashboard.my_invoices')} value={myInvoices.length} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title={t('dashboard.warehouse_pickups')} value={myUserInvoices.length} prefix={<InboxOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title={t('dashboard.payments_submitted')} value={formatCurrency(totalCollected)} prefix={<DollarOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title={t('dashboard.recent_invoices')} style={{ height: 350, overflow: 'auto' }}>
            <List size="small" dataSource={myInvoices.slice(0, 10)} renderItem={inv => (
              <List.Item extra={<Tag color={inv.paid ? 'green' : 'orange'}>{inv.paid ? t('common.paid') : t('common.unpaid')}</Tag>}>
                <List.Item.Meta
                  title={inv.shop?.title}
                  description={`${formatDateTime(inv.date)} - ${formatCurrency(inv.totalPrice)}`}
                />
              </List.Item>
            )} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('dashboard.my_shops')} style={{ height: 350, overflow: 'auto' }}>
            <List size="small" dataSource={myShops} renderItem={s => (
              <List.Item>
                <List.Item.Meta title={s.title} description={s.tel || s.gps || '-'} />
              </List.Item>
            )} />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default UserDashboard;
