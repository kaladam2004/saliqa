import React, { useState } from 'react';
import { Modal, Tag, Avatar, Spin, Form, Input, InputNumber, Button, message, Switch, Select, type FormInstance } from 'antd';
import {
  BankOutlined, ShopOutlined, BarChartOutlined, HistoryOutlined,
  RightOutlined, InboxOutlined, AppstoreOutlined, EditOutlined, DeleteOutlined,
  PlusOutlined, CheckOutlined, CreditCardOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import ImageUpload from '../../../components/common/ImageUpload';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../../api/warehouses';
import { getShops, createShop, updateShop, deleteShop } from '../../../api/shops';
import { getEventLogs } from '../../../api/eventLogs';
import { getExpenses, createExpense, approveExpense } from '../../../api/expenses';
import { getUserInvoices } from '../../../api/userInvoices';
import { getPayments } from '../../../api/payments';
import { getUsers } from '../../../api/users';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';
import type { Warehouse, Shop, EventLog, Expense, WarehouseRequest, ShopRequest, ExpenseRequest } from '../../../types';

type Section = null | 'warehouses' | 'shops' | 'expenses' | 'logs' | 'userInvoices' | 'payments';

const card = { background: '#fff', borderRadius: 14, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as const;

const MenuRow: React.FC<{
  icon: React.ReactNode; label: string; count?: number;
  color: string; bg: string; onClick: () => void;
}> = ({ icon, label, count, color, bg, onClick }) => (
  <button onClick={onClick} style={{
    width: '100%', border: 'none', background: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    textAlign: 'left', transition: 'background 0.15s',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 19, color, flexShrink: 0,
    }}>
      {icon}
    </div>
    <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>{label}</span>
    {count !== undefined && (
      <span style={{
        background: '#1677ff', color: '#fff', borderRadius: 10,
        fontSize: 11, fontWeight: 600, padding: '2px 8px', marginRight: 4,
      }}>{count}</span>
    )}
    <RightOutlined style={{ color: '#d1d5db', fontSize: 13 }} />
  </button>
);

const MoreTab: React.FC = () => {
  const [section, setSection] = useState<Section>(null);
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Forms
  const [warehouseForm] = Form.useForm();
  const [shopForm] = Form.useForm();
  const [expenseForm] = Form.useForm();

  // Edit state
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const [warehouseGpsLoading, setWarehouseGpsLoading] = useState(false);
  const [shopGpsLoading, setShopGpsLoading] = useState(false);

  const getGps = (form: FormInstance, setLoading: (v: boolean) => void) => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        form.setFieldValue('gps', `${pos.coords.latitude},${pos.coords.longitude}`);
        setLoading(false);
      },
      () => { message.error(t('profile.gps_error')); setLoading(false); },
    );
  };

  const { data: warehouses = [], isLoading: wLoading } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: shops = [], isLoading: sLoading } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: logs = [], isLoading: lLoading } = useQuery({ queryKey: ['event-logs'], queryFn: getEventLogs });
  const { data: expenses = [], isLoading: eLoading } = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const { data: userInvoices = [], isLoading: uiLoading } = useQuery({ queryKey: ['user-invoices'], queryFn: getUserInvoices });
  const { data: payments = [], isLoading: pLoading } = useQuery({ queryKey: ['payments'], queryFn: getPayments });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const pendingExpenses = expenses.filter(e => !e.approved).length;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  // Warehouse mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseRequest) => createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      message.success(t('warehouses.warehouse_created'));
      setWarehouseModalOpen(false);
      warehouseForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WarehouseRequest }) => updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      message.success(t('warehouses.warehouse_updated'));
      setEditWarehouse(null);
      setWarehouseModalOpen(false);
      warehouseForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      message.success(t('warehouses.warehouse_deleted'));
    },
    onError: () => message.error(t('common.error')),
  });

  // Shop mutations
  const createShopMutation = useMutation({
    mutationFn: (data: ShopRequest) => createShop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      message.success(t('shops.shop_created'));
      setShopModalOpen(false);
      shopForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const updateShopMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShopRequest }) => updateShop(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      message.success(t('shops.shop_updated'));
      setEditShop(null);
      setShopModalOpen(false);
      shopForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteShopMutation = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      message.success(t('shops.shop_deleted'));
    },
    onError: () => message.error(t('common.error')),
  });

  // Expense mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseRequest) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      message.success(t('expenses.expense_created'));
      setExpenseModalOpen(false);
      expenseForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const approveExpenseMutation = useMutation({
    mutationFn: (id: number) => approveExpense(id, authUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      message.success(t('expenses.approved'));
    },
    onError: () => message.error(t('common.error')),
  });

  // Warehouse handlers
  const openCreateWarehouse = () => {
    setEditWarehouse(null);
    warehouseForm.resetFields();
    setWarehouseModalOpen(true);
  };

  const openEditWarehouse = (w: Warehouse) => {
    setEditWarehouse(w);
    warehouseForm.setFieldsValue({
      title: w.title,
      description: w.description,
      responsiblePerson: w.responsiblePerson,
      tel: w.tel,
      gps: w.gps,
      image: w.image,
    });
    setWarehouseModalOpen(true);
  };

  const confirmDeleteWarehouse = (w: Warehouse) => {
    Modal.confirm({
      title: `"${w.title}" ${t('common.confirm_delete')}`,
      okText: t('confirm_delete.ok'),
      cancelText: t('confirm_delete.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteWarehouseMutation.mutate(w.id),
    });
  };

  const handleWarehouseSubmit = (vals: WarehouseRequest) => {
    if (editWarehouse) {
      updateWarehouseMutation.mutate({ id: editWarehouse.id, data: vals });
    } else {
      createWarehouseMutation.mutate(vals);
    }
  };

  // Shop handlers
  const openCreateShop = () => {
    setEditShop(null);
    shopForm.resetFields();
    shopForm.setFieldsValue({ test: false });
    setShopModalOpen(true);
  };

  const openEditShop = (s: Shop) => {
    setEditShop(s);
    shopForm.setFieldsValue({
      title: s.title,
      description: s.description,
      tel: s.tel,
      gps: s.gps,
      image: s.image,
      shopkeeperId: s.shopkeeper?.id,
      test: s.test,
    });
    setShopModalOpen(true);
  };

  const confirmDeleteShop = (s: Shop) => {
    Modal.confirm({
      title: `"${s.title}" ${t('common.confirm_delete')}`,
      okText: t('confirm_delete.ok'),
      cancelText: t('confirm_delete.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteShopMutation.mutate(s.id),
    });
  };

  const handleShopSubmit = (vals: ShopRequest) => {
    if (editShop) {
      updateShopMutation.mutate({ id: editShop.id, data: vals });
    } else {
      createShopMutation.mutate(vals);
    }
  };

  const groups = [
    {
      title: t('layout.management') || 'Идоракунӣ',
      items: [
        { key: 'warehouses' as Section, icon: <BankOutlined />, label: t('menu.warehouses'), count: warehouses.length, color: '#fa8c16', bg: '#fff7e6' },
        { key: 'shops' as Section, icon: <ShopOutlined />, label: t('menu.shops'), count: shops.length, color: '#13c2c2', bg: '#e6fffb' },
        { key: 'payments' as Section, icon: <CreditCardOutlined />, label: t('menu.payments'), count: undefined, color: '#1677ff', bg: '#e8f4ff' },
      ],
    },
    {
      title: t('layout.reports') || 'Ҳисобот',
      items: [
        { key: 'userInvoices' as Section, icon: <InboxOutlined />, label: t('menu.user_invoices'), count: userInvoices.length, color: '#722ed1', bg: '#f9f0ff' },
        { key: 'expenses' as Section, icon: <BarChartOutlined />, label: t('menu.my_expenses'), count: pendingExpenses > 0 ? pendingExpenses : undefined, color: '#52c41a', bg: '#f0fff4' },
        { key: 'logs' as Section, icon: <HistoryOutlined />, label: t('menu.event_logs'), count: undefined, color: '#6366f1', bg: '#eef2ff' },
      ],
    },
  ];

  const renderContent = () => {
    if (section === 'warehouses') {
      if (wLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
          <button
            onClick={openCreateWarehouse}
            style={{
              width: '100%', border: '2px dashed #1677ff', background: '#f0f7ff',
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, color: '#1677ff', fontWeight: 600,
            }}
          >
            <PlusOutlined /> {t('warehouses.add_warehouse')}
          </button>
          {warehouses.map((w: Warehouse) => (
            <div key={w.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{w.title}</div>
                  {w.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{w.description}</div>}
                  {w.responsiblePerson && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t('common.responsible')}: {w.responsiblePerson}</div>}
                  {w.tel && <div style={{ fontSize: 11, color: '#9ca3af' }}>{w.tel}</div>}
                  <div style={{ fontSize: 12, color: '#1677ff', marginTop: 4 }}>
                    <AppstoreOutlined style={{ marginRight: 4 }} />
                    {t('common.products_count', { count: w.products?.length ?? 0 })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEditWarehouse(w)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#e8f4ff', color: '#1677ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <EditOutlined style={{ fontSize: 13 }} />
                  </button>
                  <button
                    onClick={() => confirmDeleteWarehouse(w)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#fff1f0', color: '#f5222d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <DeleteOutlined style={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'shops') {
      if (sLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
          <button
            onClick={openCreateShop}
            style={{
              width: '100%', border: '2px dashed #13c2c2', background: '#f0fffe',
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, color: '#13c2c2', fontWeight: 600,
            }}
          >
            <PlusOutlined /> {t('shops.add_shop')}
          </button>
          {shops.map((s: Shop) => (
            <div key={s.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                    {s.test && <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>Тест</Tag>}
                  </div>
                  {s.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.description}</div>}
                  {s.shopkeeper && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t('common.responsible')}: {s.shopkeeper.fullname}</div>}
                  {s.tel && <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.tel}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEditShop(s)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#e8f4ff', color: '#1677ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <EditOutlined style={{ fontSize: 13 }} />
                  </button>
                  <button
                    onClick={() => confirmDeleteShop(s)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#fff1f0', color: '#f5222d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <DeleteOutlined style={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'payments') {
      if (pLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
          {/* Total stat */}
          <div style={{
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            borderRadius: 14, padding: '14px 16px', color: '#fff',
          }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{t('common.total_paid')}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(totalPaid)}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{payments.length} {t('dashboard.transactions')}</div>
          </div>
          {payments.slice(0, 50).map(p => (
            <div key={p.id} style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.shopTitle}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatDate(p.paidAt)}</div>
                  <Tag style={{ marginTop: 4, fontSize: 10 }}>{p.paymentMethod}</Tag>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#52c41a' }}>{formatCurrency(p.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'expenses') {
      if (eLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
          <button
            onClick={() => setExpenseModalOpen(true)}
            style={{
              width: '100%', border: '2px dashed #52c41a', background: '#f6ffed',
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a', fontWeight: 600,
            }}
          >
            <PlusOutlined /> {t('expenses.add_expense')}
          </button>
          {expenses.slice(0, 30).map((e: Expense) => (
            <div key={e.id} style={{
              ...card,
              borderLeft: `3px solid ${e.approved ? '#52c41a' : '#fa8c16'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{formatCurrency(e.total)}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{e.description}</div>
                  {e.category && <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.category}</div>}
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatDate(e.date)}</div>
                  {(e.userFullname || e.adminFullname) && (
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{e.userFullname || e.adminFullname}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <Tag color={e.approved ? 'green' : 'orange'} style={{ margin: 0, fontSize: 10 }}>
                    {e.approved ? t('expenses.approved_label') : t('common.pending')}
                  </Tag>
                  {!e.approved && (
                    <button
                      onClick={() => approveExpenseMutation.mutate(e.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: 'none',
                        background: '#f6ffed', color: '#52c41a', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <CheckOutlined style={{ fontSize: 13 }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'logs') {
      if (lLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0' }}>
          {logs.slice(0, 50).map((log: EventLog, i) => (
            <div key={log.id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < logs.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <Avatar size={32} style={{ background: '#e8f4ff', color: '#1677ff', flexShrink: 0, fontSize: 12 }}>
                {log.actorUsername?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tag color="blue" style={{ margin: '0 0 2px', fontSize: 10, lineHeight: '16px' }}>{log.eventType}</Tag>
                <div style={{ fontSize: 12, color: '#374151' }}>{log.description}</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                  {log.actorUsername} · {formatDateTime(log.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === 'userInvoices') {
      if (uiLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
          {userInvoices.slice(0, 30).map((ui: any) => (
            <div key={ui.id} style={{
              ...card,
              borderLeft: `3px solid ${ui.paid ? '#52c41a' : '#fa8c16'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>#{ui.id} · {ui.warehouse?.title}</span>
                <Tag color={ui.paid ? 'green' : 'orange'} style={{ margin: 0, fontSize: 10 }}>
                  {ui.paid ? t('common.paid') : t('common.unpaid')}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t('common.sales_rep')}: {ui.user?.fullname}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1677ff' }}>{formatCurrency(ui.totalPrice)}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(ui.date)}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const sectionTitle = () => {
    switch (section) {
      case 'warehouses': return t('menu.warehouses');
      case 'shops': return t('menu.shops');
      case 'expenses': return t('menu.my_expenses');
      case 'logs': return t('menu.event_logs');
      case 'userInvoices': return t('menu.user_invoices');
      case 'payments': return t('menu.payments');
      default: return '';
    }
  };

  return (
    <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(group => (
        <div key={group.title}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, paddingLeft: 4 }}>
            {group.title}
          </div>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {group.items.map((item, i) => (
              <div key={String(item.key)}>
                <MenuRow
                  icon={item.icon} label={item.label} count={item.count}
                  color={item.color} bg={item.bg}
                  onClick={() => setSection(item.key)}
                />
                {i < group.items.length - 1 && <div style={{ height: 1, background: '#f5f5f5', margin: '0 16px' }} />}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Detail Modal */}
      <Modal
        title={sectionTitle()}
        open={!!section}
        onCancel={() => setSection(null)}
        footer={null}
        destroyOnHidden
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', padding: '0 16px' } }}
      >
        {renderContent()}
      </Modal>

      {/* Warehouse create/edit modal */}
      <Modal
        title={editWarehouse ? `${t('warehouses.edit_warehouse')}: ${editWarehouse.title}` : t('warehouses.add_warehouse')}
        open={warehouseModalOpen}
        onCancel={() => { setWarehouseModalOpen(false); setEditWarehouse(null); warehouseForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={warehouseForm} layout="vertical" onFinish={handleWarehouseSubmit}>
          <Form.Item name="title" label={t('common.title')} rules={[{ required: true, message: t('common.required') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="responsiblePerson" label={t('warehouses.responsible_person')}>
            <Input />
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}>
            <Input placeholder="+992..." />
          </Form.Item>
          <Form.Item label={t('common.gps')}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="gps" noStyle>
                <Input placeholder="lat,lng" />
              </Form.Item>
              <Button
                icon={<EnvironmentOutlined />}
                loading={warehouseGpsLoading}
                onClick={() => getGps(warehouseForm, setWarehouseGpsLoading)}
              />
            </div>
          </Form.Item>
          <Form.Item name="image" label={t('upload.photo')}>
            <ImageUpload />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary" htmlType="submit" block
              loading={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
            >
              {editWarehouse ? t('common.update') : t('common.create')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Shop create/edit modal */}
      <Modal
        title={editShop ? `${t('shops.edit_shop')}: ${editShop.title}` : t('shops.add_shop')}
        open={shopModalOpen}
        onCancel={() => { setShopModalOpen(false); setEditShop(null); shopForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={shopForm} layout="vertical" onFinish={handleShopSubmit} initialValues={{ test: false }}>
          <Form.Item name="title" label={t('common.title')} rules={[{ required: true, message: t('common.required') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}>
            <Input placeholder="+992..." />
          </Form.Item>
          <Form.Item label={t('common.gps')}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="gps" noStyle>
                <Input placeholder="lat,lng" />
              </Form.Item>
              <Button
                icon={<EnvironmentOutlined />}
                loading={shopGpsLoading}
                onClick={() => getGps(shopForm, setShopGpsLoading)}
              />
            </div>
          </Form.Item>
          <Form.Item name="image" label={t('upload.photo')}>
            <ImageUpload />
          </Form.Item>
          <Form.Item name="shopkeeperId" label={t('shops.shopkeeper')}>
            <Select placeholder={t('shops.select_user')} allowClear>
              {users.map(u => (
                <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="test" label={t('shops.test_shop')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary" htmlType="submit" block
              loading={createShopMutation.isPending || updateShopMutation.isPending}
            >
              {editShop ? t('common.update') : t('common.create')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense create modal */}
      <Modal
        title={t('expenses.add_expense')}
        open={expenseModalOpen}
        onCancel={() => { setExpenseModalOpen(false); expenseForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={expenseForm} layout="vertical" onFinish={(vals) => {
          createExpenseMutation.mutate({ ...vals, adminId: authUser?.id });
        }}>
          <Form.Item name="total" label={t('common.amount')} rules={[{ required: true, message: t('common.required') }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')} rules={[{ required: true, message: t('common.required') }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="category" label={t('expenses.category')}>
            <Select placeholder={t('expenses.select_category')} allowClear>
              {['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'COMMUNICATION', 'UTILITIES', 'OTHER'].map(c => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="date" label={t('common.date')} rules={[{ required: true, message: t('common.required') }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={createExpenseMutation.isPending}>
              {t('common.create')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MoreTab;
