import React, { useState } from 'react';
import { Dropdown, Button } from 'antd';
import {
  HomeOutlined, AppstoreOutlined, FileTextOutlined,
  TeamOutlined, EllipsisOutlined, GlobalOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import DashboardTab from './DashboardTab';
import ProductsTab from './ProductsTab';
import InvoicesTab from './InvoicesTab';
import UsersTab from './UsersTab';
import MoreTab from './MoreTab';

type Tab = 'dashboard' | 'products' | 'invoices' | 'users' | 'more';

const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
  { key: 'tg', label: 'Тоҷикӣ' },
];

const MobileAdminApp: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'dashboard', icon: <HomeOutlined />, label: t('menu.dashboard') },
    { key: 'products',  icon: <AppstoreOutlined />, label: t('menu.products') },
    { key: 'invoices',  icon: <FileTextOutlined />, label: t('menu.invoices') },
    { key: 'users',     icon: <TeamOutlined />, label: t('menu.sales_reps') },
    { key: 'more',      icon: <EllipsisOutlined />, label: t('common.more') || 'More' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f0f4ff', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        padding: '10px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxShadow: '0 2px 12px rgba(22,119,255,0.25)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            WMS Admin
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            {user?.fullname}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Dropdown menu={{
            items: LANGUAGES.map(l => ({ key: l.key, label: l.label, onClick: () => changeLanguage(l.key) })),
            selectedKeys: [i18n.language],
          }}>
            <Button type="text" size="small" icon={<GlobalOutlined />} style={{ color: '#fff' }} />
          </Dropdown>
          <Button
            type="text" size="small" icon={<LogoutOutlined />} style={{ color: '#fff' }}
            onClick={() => { logout(); window.location.href = '/login'; }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'products'  && <ProductsTab />}
        {tab === 'invoices'  && <InvoicesTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'more'      && <MoreTab />}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        height: 60, background: '#fff', borderTop: '1px solid #e8ecf4',
        display: 'flex', flexShrink: 0, zIndex: 10,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        {tabs.map(({ key, icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2, padding: '6px 0',
            color: tab === key ? '#1677ff' : '#9ca3af',
            fontSize: 10, fontWeight: tab === key ? 600 : 400,
            transition: 'color 0.2s', position: 'relative',
          }}>
            {tab === key && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 3, background: '#1677ff', borderRadius: '0 0 6px 6px',
              }} />
            )}
            <span style={{ fontSize: 21 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileAdminApp;
