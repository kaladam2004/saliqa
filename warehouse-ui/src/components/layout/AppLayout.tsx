import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography, Dropdown } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';
import MobileUserApp from '../../pages/user/mobile/MobileUserApp';
import MobileAdminApp from '../../pages/admin/mobile/MobileAdminApp';
import {
  DashboardOutlined, ShopOutlined, InboxOutlined, UserOutlined,
  FileTextOutlined, DollarOutlined, RollbackOutlined, BankOutlined,
  AppstoreOutlined, TeamOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, BarChartOutlined, HistoryOutlined,
  ThunderboltOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const { Header, Sider, Content } = Layout;

const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
  { key: 'tg', label: 'Тоҷикӣ' },
];

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isUser } = useAuthStore();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (isMobile && isUser()) return <MobileUserApp />;
  if (isMobile && isAdmin()) return <MobileAdminApp />;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const adminMenuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/admin/profile', icon: <UserOutlined />, label: t('menu.profile') },
    { type: 'divider' },
    { type: 'group', label: t('layout.quick_setup'), children: [
      { key: '/admin/wizard/warehouse', icon: <ThunderboltOutlined />, label: t('menu.setup_warehouse') },
      { key: '/admin/wizard/products', icon: <ThunderboltOutlined />, label: t('menu.add_products') },
      { key: '/admin/wizard/user', icon: <ThunderboltOutlined />, label: t('menu.onboard_rep') },
      { key: '/admin/wizard/accept-payment', icon: <ThunderboltOutlined />, label: t('menu.accept_payment') },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('layout.management'), children: [
      { key: '/admin/admins', icon: <TeamOutlined />, label: t('menu.admins') },
      { key: '/admin/users', icon: <UserOutlined />, label: t('menu.sales_reps') },
      { key: '/admin/warehouses', icon: <BankOutlined />, label: t('menu.warehouses') },
      { key: '/admin/products', icon: <AppstoreOutlined />, label: t('menu.products') },
      { key: '/admin/shops', icon: <ShopOutlined />, label: t('menu.shops') },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('layout.reports'), children: [
      { key: '/admin/analytics', icon: <BarChartOutlined />, label: t('menu.analytics') },
      { key: '/admin/invoices', icon: <FileTextOutlined />, label: t('menu.invoices') },
      { key: '/admin/payments', icon: <DollarOutlined />, label: t('menu.payments') },
      { key: '/admin/user-invoices', icon: <InboxOutlined />, label: t('menu.user_invoices') },
      { key: '/admin/user-payments', icon: <DollarOutlined />, label: t('menu.user_payments') },
      { key: '/admin/my-expenses', icon: <BarChartOutlined />, label: t('menu.my_expenses') },
      { key: '/admin/user-expenses', icon: <BarChartOutlined />, label: t('menu.user_expenses_approval') },
      { key: '/admin/event-logs', icon: <HistoryOutlined />, label: t('menu.event_logs') },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('layout.catalog'), children: [
      { key: '/admin/batches', icon: <InboxOutlined />, label: t('menu.batches') },
      { key: '/admin/templates', icon: <FileTextOutlined />, label: t('menu.templates') },
    ]},
  ];

  const userMenuItems = [
    { key: '/user', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/user/profile', icon: <UserOutlined />, label: t('menu.profile') },
    { type: 'divider' },
    { type: 'group', label: t('layout.daily_tasks'), children: [
      { key: '/user/wizard/sales', icon: <ThunderboltOutlined />, label: t('menu.create_invoice') },
      { key: '/user/wizard/payment', icon: <ThunderboltOutlined />, label: t('menu.collect_payment') },
      { key: '/user/wizard/bulk-payment', icon: <ThunderboltOutlined />, label: t('menu.bulk_collect_payment') },
      { key: '/user/wizard/return', icon: <ThunderboltOutlined />, label: t('menu.process_return') },
      { key: '/user/wizard/pickup', icon: <ThunderboltOutlined />, label: t('menu.warehouse_pickup') },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('layout.records'), children: [
      { key: '/user/shops', icon: <ShopOutlined />, label: t('menu.my_shops') },
      { key: '/user/invoices', icon: <FileTextOutlined />, label: t('menu.all_invoices') },
      { key: '/user/payments', icon: <DollarOutlined />, label: t('menu.payments') },
      { key: '/user/returns', icon: <RollbackOutlined />, label: t('menu.returns') },
      { key: '/user/user-invoices', icon: <InboxOutlined />, label: t('menu.warehouse_pickups') },
      { key: '/user/my-pickups', icon: <FileTextOutlined />, label: t('menu.my_pickups') },
      { key: '/user/user-payments', icon: <DollarOutlined />, label: t('menu.submit_payments') },
      { key: '/user/user-returns', icon: <RollbackOutlined />, label: t('menu.warehouse_returns') },
      { key: '/user/shop-payments', icon: <DollarOutlined />, label: t('menu.shop_payments') },
      { key: '/user/my-admin-payments', icon: <DollarOutlined />, label: t('menu.my_admin_payments') },
      { key: '/user/my-expenses', icon: <BarChartOutlined />, label: t('menu.my_expenses') },
    ]},
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuItems: any[] = isAdmin() ? adminMenuItems : isUser() ? userMenuItems : [];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #333' }}>
          <Typography.Title level={5} style={{ color: '#fff', margin: 0 }}>
            {collapsed ? t('layout.title_short') : t('layout.title')}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Dropdown menu={{
              items: LANGUAGES.map(l => ({
                key: l.key,
                label: l.label,
                onClick: () => changeLanguage(l.key),
              })),
              selectedKeys: [i18n.language],
            }}>
              <Button type="text" icon={<GlobalOutlined />}>
                {LANGUAGES.find(l => l.key === i18n.language)?.label ?? 'EN'}
              </Button>
            </Dropdown>
            <Dropdown menu={{
              items: [
                { key: 'logout', icon: <LogoutOutlined />, label: t('layout.logout'), onClick: () => { logout(); navigate('/login'); } }
              ]
            }}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <Typography.Text>{user?.fullname}</Typography.Text>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '16px', padding: '24px', background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
