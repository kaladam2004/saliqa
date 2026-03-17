import React, { useMemo } from 'react';
import { Spin, Tag } from 'antd';
import {
  FileTextOutlined, InboxOutlined, BarChartOutlined, CheckCircleOutlined,
  ShopOutlined, DollarCircleOutlined, RollbackOutlined, PlusCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { filterInvoices } from '../../../api/invoices';
import { filterUserInvoices } from '../../../api/userInvoices';
import { getExpensesByUser } from '../../../api/expenses';
import { getShops } from '../../../api/shops';
import { useAuthStore } from '../../../store/authStore';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import type { Invoice } from '../../../types';

const RECENT_KEY = 'recent_shops';
const getRecentIds = (): number[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: number | string;
  color: string; bg: string;
}> = ({ icon, label, value, color, bg }) => (
  <div style={{
    background: '#fff', borderRadius: 14, padding: '14px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex', alignItems: 'center', gap: 12, flex: 1,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, color, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

const UserDashboardTab: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['my-invoices', user?.id],
    queryFn: () => filterInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });

  const { data: pickups = [], isLoading: pickupLoading } = useQuery({
    queryKey: ['my-pickups', user?.id],
    queryFn: () => filterUserInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });

  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ['expenses-user', user?.id],
    queryFn: () => getExpensesByUser(user!.id),
    enabled: !!user?.id,
  });

  const isLoading = invLoading || pickupLoading || expLoading;

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });

  const unpaidInvoices = invoices.filter(i => !i.paid).length;
  const pendingExpenses = expenses.filter(e => !e.approved).length;
  const recent5 = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const recentShops = useMemo(() => {
    const ids = getRecentIds();
    return ids.map(id => shops.find(s => s.id === id)).filter(Boolean) as typeof shops;
  }, [shops]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t('mobile.greeting_morning') : hour < 17 ? t('mobile.greeting_day') : t('mobile.greeting_evening');
  const dateLocale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'tg' ? 'tg-TJ' : 'en-US';

  return (
    <div style={{ padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Welcome card */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        borderRadius: 16, padding: '18px 20px',
        boxShadow: '0 4px 16px rgba(22,119,255,0.3)',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{greeting},</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: 2 }}>{user?.fullname}</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4 }}>
          {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard
              icon={<FileTextOutlined />}
              label={t('menu.invoices')}
              value={invoices.length}
              color="#1677ff"
              bg="#e8f4ff"
            />
            <StatCard
              icon={<CheckCircleOutlined />}
              label={t('common.unpaid')}
              value={unpaidInvoices}
              color="#fa8c16"
              bg="#fff7e6"
            />
            <StatCard
              icon={<InboxOutlined />}
              label={t('user_invoices.my_pickups_title') || 'Олиш'}
              value={pickups.length}
              color="#722ed1"
              bg="#f9f0ff"
            />
            <StatCard
              icon={<BarChartOutlined />}
              label={t('expenses.pending') || 'Кутарбуда'}
              value={pendingExpenses}
              color="#52c41a"
              bg="#f0fff4"
            />
          </div>

          {/* Quick actions */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {t('mobile.quick_actions')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: <PlusCircleOutlined style={{ fontSize: 22, color: '#1677ff' }} />, label: t('mobile.action_create_invoice'), bg: '#e8f4ff', tab: 'shops' },
                { icon: <ShopOutlined style={{ fontSize: 22, color: '#13c2c2' }} />, label: t('menu.shops'), bg: '#e6fffb', tab: 'shops' },
                { icon: <InboxOutlined style={{ fontSize: 22, color: '#722ed1' }} />, label: t('mobile.action_warehouse'), bg: '#f9f0ff', tab: 'warehouse' },
                { icon: <RollbackOutlined style={{ fontSize: 22, color: '#fa8c16' }} />, label: t('mobile.action_return'), bg: '#fff7e6', tab: 'shops' },
                { icon: <DollarCircleOutlined style={{ fontSize: 22, color: '#52c41a' }} />, label: t('mobile.action_payment'), bg: '#f0fff4', tab: 'shops' },
                { icon: <BarChartOutlined style={{ fontSize: 22, color: '#f5222d' }} />, label: t('mobile.action_expenses'), bg: '#fff1f0', tab: 'warehouse' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => onNavigate?.(item.tab)}
                  style={{
                    background: '#fff', borderRadius: 14, padding: '14px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent shops */}
          {recentShops.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {t('mobile.recent_shops')}
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {recentShops.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onNavigate?.('shops')}
                    style={{
                      flexShrink: 0, background: '#fff', borderRadius: 12, padding: '8px 14px',
                      border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e6fffb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      <ShopOutlined style={{ color: '#13c2c2' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap' }}>{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent invoices */}
          {recent5.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {t('mobile.recent_invoices')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recent5.map((inv: Invoice) => (
                  <div key={inv.id} style={{
                    background: '#fff', borderRadius: 14, padding: '12px 14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.shop?.title}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatDate(inv.date)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1677ff' }}>{formatCurrency(inv.totalPrice)}</div>
                      <Tag
                        color={inv.paid ? 'green' : 'orange'}
                        style={{ margin: '2px 0 0', fontSize: 10 }}
                      >
                        {inv.paid ? t('common.paid') : t('common.unpaid')}
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserDashboardTab;
