import React, { useState } from 'react';
import { Button, Dropdown } from 'antd';
import {
  HomeOutlined, ShopOutlined, InboxOutlined, UserOutlined,
  GlobalOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import UserDashboardTab from './UserDashboardTab';
import ShopsTab from './ShopsTab';
import WarehouseTab from './WarehouseTab';
import ProfileTab from './ProfileTab';

type MainTab = 'dashboard' | 'shops' | 'warehouse' | 'profile';

const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
  { key: 'tg', label: 'Тоҷикӣ' },
];

const MobileUserApp: React.FC = () => {
  const [tab, setTab] = useState<MainTab>('dashboard');
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const tabs: { key: MainTab; icon: React.ReactNode; label: string }[] = [
    { key: 'dashboard', icon: <HomeOutlined />,  label: t('menu.dashboard') },
    { key: 'shops',     icon: <ShopOutlined />,  label: t('menu.shops') },
    { key: 'warehouse', icon: <InboxOutlined />, label: t('mobile.tab_warehouse') },
    { key: 'profile',   icon: <UserOutlined />,  label: t('mobile.tab_profile') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f0f4ff', overflow: 'hidden' }}>
      {/* Header - same style as admin */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        padding: '10px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxShadow: '0 2px 12px rgba(22,119,255,0.25)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            WMS
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

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tab === 'dashboard' && <UserDashboardTab onNavigate={t => setTab(t as MainTab)} />}
        {tab === 'shops'     && <ShopsTab />}
        {tab === 'warehouse' && <WarehouseTab />}
        {tab === 'profile'   && <ProfileTab />}
      </div>

      {/* Bottom tab bar - same style as admin */}
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

export default MobileUserApp;
