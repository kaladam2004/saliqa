import React, { useMemo } from 'react';
import { Tag } from 'antd';
import {
  AppstoreOutlined, FileTextOutlined, UserOutlined, BankOutlined,
  ShopOutlined, DollarOutlined, WarningOutlined, RiseOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../../api/products';
import { getInvoices } from '../../../api/invoices';
import { getUsers } from '../../../api/users';
import { getWarehouses } from '../../../api/warehouses';
import { getShops } from '../../../api/shops';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../utils/helpers';

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  color: string; bg: string;
}> = ({ icon, label, value, color, bg }) => (
  <div style={{
    background: '#fff', borderRadius: 16, padding: '14px 12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: 8,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, color,
    }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
  </div>
);

const DashboardTab: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });

  const unpaid = invoices.filter(i => !i.paid).length;
  const lowStock = products.filter(p => p.quantity < 10);
  const totalRevenue = invoices.filter(i => i.paid).reduce((s, i) => s + Number(i.totalPrice || 0), 0);

  // Top 10 shops: by revenue (paid invoices), with debt (unpaid invoices)
  const topShops = useMemo(() => {
    const map = new Map<number, { id: number; title: string; revenue: number; debt: number; count: number }>();
    for (const inv of invoices) {
      const prev = map.get(inv.shop.id) ?? { id: inv.shop.id, title: inv.shop.title, revenue: 0, debt: 0, count: 0 };
      if (inv.paid) prev.revenue += Number(inv.totalPrice || 0);
      else prev.debt += Number(inv.totalPrice || 0);
      prev.count++;
      map.set(inv.shop.id, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [invoices]);

  // Top 10 products: by total quantity sold
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const inv of invoices) {
      for (const p of inv.products) {
        const prev = map.get(p.productName) ?? { name: p.productName, qty: 0, revenue: 0 };
        prev.qty += p.quantity;
        prev.revenue += Number(p.totalPrice || 0);
        map.set(p.productName, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [invoices]);

  return (
    <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Welcome card */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        borderRadius: 20, padding: '18px 20px', color: '#fff',
      }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 2 }}>
          {t('dashboard.welcome', { name: '' })}
        </div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{user?.fullname}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{user?.role?.replace('_', ' ')}</div>
        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: 'rgba(255,255,255,0.15)', borderRadius: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{t('dashboard.unpaid')} / {t('dashboard.total_revenue')}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{unpaid} | {formatCurrency(totalRevenue)}</div>
          </div>
          <DollarOutlined style={{ fontSize: 26, opacity: 0.4 }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatCard icon={<AppstoreOutlined />} label={t('dashboard.products')} value={products.length} color="#1677ff" bg="#e8f4ff" />
        <StatCard icon={<FileTextOutlined />} label={t('dashboard.invoices')} value={invoices.length} color="#52c41a" bg="#f0fff4" />
        <StatCard icon={<UserOutlined />} label={t('dashboard.users')} value={users.length} color="#722ed1" bg="#f9f0ff" />
        <StatCard icon={<BankOutlined />} label={t('dashboard.warehouses')} value={warehouses.length} color="#fa8c16" bg="#fff7e6" />
        <StatCard icon={<ShopOutlined />} label={t('dashboard.shops')} value={shops.length} color="#13c2c2" bg="#e6fffb" />
        <StatCard
          icon={<DollarOutlined />} label={t('dashboard.unpaid')} value={unpaid}
          color={unpaid > 0 ? '#f5222d' : '#52c41a'}
          bg={unpaid > 0 ? '#fff1f0' : '#f0fff4'}
        />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <WarningOutlined style={{ color: '#fa8c16', fontSize: 15 }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t('dashboard.low_stock')} ({lowStock.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lowStock.slice(0, 5).map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', background: '#fffbf0', borderRadius: 10,
                borderLeft: '3px solid #fa8c16',
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{p.name}</span>
                <Tag color={p.quantity === 0 ? 'red' : 'orange'} style={{ margin: 0, fontSize: 11 }}>
                  {t('common.units_short', { count: p.quantity })}
                </Tag>
              </div>
            ))}
            {lowStock.length > 5 && (
              <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', paddingTop: 4 }}>
                {t('common.more_items', { count: lowStock.length - 5 })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top 10 Shops */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <TrophyOutlined style={{ color: '#fa8c16', fontSize: 15 }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{t('dashboard.top_shops')}</span>
        </div>
        {topShops.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 16 }}>{t('dashboard.no_data')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topShops.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10,
                background: i < 3 ? (i === 0 ? '#fffbe6' : i === 1 ? '#f5f5f5' : '#fff7e6') : '#fafafa',
                borderLeft: `3px solid ${i === 0 ? '#faad14' : i === 1 ? '#8c8c8c' : i === 2 ? '#fa8c16' : '#e8ecf4'}`,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? '#faad14' : i === 1 ? '#8c8c8c' : i === 2 ? '#fa8c16' : '#e8ecf4',
                  color: i < 3 ? '#fff' : '#9ca3af',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#52c41a', fontWeight: 600 }}>{formatCurrency(s.revenue)}</span>
                    {s.debt > 0 && <span style={{ fontSize: 10, color: '#f5222d' }}>−{formatCurrency(s.debt)} {t('dashboard.debt')}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{s.count} {t('common.invoices_abbr')}</Tag>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 10 Products */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <RiseOutlined style={{ color: '#1677ff', fontSize: 15 }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{t('dashboard.top_products')}</span>
        </div>
        {topProducts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 16 }}>{t('dashboard.no_data')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topProducts.map((p, i) => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10,
                background: i < 3 ? '#f0f7ff' : '#fafafa',
                borderLeft: `3px solid ${i < 3 ? '#1677ff' : '#e8ecf4'}`,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: i < 3 ? '#1677ff' : '#e8ecf4',
                  color: i < 3 ? '#fff' : '#9ca3af',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 600, marginTop: 2 }}>
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
                <Tag color="green" style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>{t('common.units_short', { count: p.qty })}</Tag>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 8 }} />
    </div>
  );
};

export default DashboardTab;
