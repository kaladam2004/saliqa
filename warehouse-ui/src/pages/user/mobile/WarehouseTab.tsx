import React, { useMemo, useState } from 'react';
import { Button, DatePicker, Divider, Empty, Input,
  InputNumber, message, Modal, Select, Space, Steps, Tag, Typography,
} from 'antd';
import {
  CheckCircleFilled, MinusOutlined, PlusOutlined, PrinterOutlined,
  RollbackOutlined, ScanOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { getProducts } from '../../../api/products';
import { getWarehouses } from '../../../api/warehouses';
import { filterUserInvoices, createUserInvoice, markUserInvoicePrinted } from '../../../api/userInvoices';
import { getUserPaymentsByUser } from '../../../api/userPayments';
import { getExpensesByUser, createExpense, deleteExpense } from '../../../api/expenses';
import { getUserReturns, createUserReturn } from '../../../api/userReturns';
import type {
  ExpenseRequest, UserInvoice, UserReturnRequest, Warehouse,
} from '../../../types';
import { formatCurrency } from '../../../utils/helpers';
import InvoicePrintModal, { type PrintInvoiceData } from '../../../components/common/InvoicePrintModal';
import QRScannerModal, { type QRVerifyTarget } from '../../../components/common/QRScannerModal';

const { Text } = Typography;

type SubTab = 'products' | 'pickups' | 'payments' | 'expenses' | 'returns';

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

const EXPENSE_CATEGORIES = ['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'COMMUNICATION', 'UTILITIES', 'OTHER'];

/* ─── design tokens ─── */
const card = {
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  overflow: 'hidden',
} as const;

/* ─── sub-tab pill bar ─── */
const SubTabBar: React.FC<{ tabs: { key: SubTab; label: string }[]; active: SubTab; onChange: (t: SubTab) => void }> = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 12px 6px', flexShrink: 0, scrollbarWidth: 'none' }}>
    {tabs.map(({ key, label }) => (
      <button key={key} onClick={() => onChange(key)} style={{
        whiteSpace: 'nowrap', border: 'none', borderRadius: 20, padding: '6px 16px',
        fontSize: 13, fontWeight: active === key ? 600 : 400, cursor: 'pointer',
        background: active === key ? '#1677ff' : '#f0f4ff',
        color: active === key ? '#fff' : '#6b7280',
        transition: 'all 0.2s',
        boxShadow: active === key ? '0 2px 8px rgba(22,119,255,0.3)' : 'none',
      }}>{label}</button>
    ))}
  </div>
);

/* ══════════════════════════════════════
   WAREHOUSE PRODUCT WIZARD
══════════════════════════════════════ */
const WarehouseProductsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [view, setView] = useState<'browse' | 'order'>('browse');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });

  const createMutation = useMutation({
    mutationFn: createUserInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pickups'] });
      message.success(t('user_invoices.pickup_created'));
      setView('browse'); setSelected(new Set()); setQtys({}); setWarehouseId(null); setNotes('');
    },
  });

  const filteredProducts = useMemo(() =>
    products.filter(p => p.quantity > 0 && p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );

  const filteredWarehouses = warehouses.filter(w =>
    w.title.toLowerCase().includes(warehouseSearch.toLowerCase()),
  );

  const orderItems = useMemo(() =>
    Array.from(selected).map(id => ({ product: products.find(p => p.id === id)!, qty: qtys[id] ?? 1 }))
      .filter(i => i.product),
    [selected, products, qtys],
  );

  const total = orderItems.reduce((s, i) => s + (i.product.price as unknown as number) * i.qty, 0);

  const toggle = (id: number) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleOrder = () => {
    if (!warehouseId) { message.error(t('mobile.select_warehouse_first')); return; }
    createMutation.mutate({
      warehouseId,
      userId: user!.id,
      notes,
      products: orderItems.map(i => ({ productId: i.product.id, quantity: i.qty })),
    });
  };

  if (view === 'browse') return (
    <div style={{ padding: 12 }}>
      <Input prefix={<SearchOutlined />} placeholder={t('mobile.search_products')} value={search}
        onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} allowClear />
      {filteredProducts.length === 0 && <Empty description={t('mobile.no_products')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredProducts.map(p => {
          const isSel = selected.has(p.id);
          return (
            <div key={p.id} onClick={() => toggle(p.id)} style={{
              background: '#fff', borderRadius: 14,
              border: `2px solid ${isSel ? '#1677ff' : 'transparent'}`,
              boxShadow: isSel ? '0 0 0 1px #1677ff, 0 4px 12px rgba(22,119,255,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
              padding: 10, cursor: 'pointer', position: 'relative',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {p.image
                  ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  : <div style={{ width: 56, height: 56, background: '#f5f5f5', borderRadius: 8, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 14 }}>{p.name}</Text>
                  <div><Text style={{ color: '#1677ff', fontWeight: 600 }}>{formatCurrency(p.price as unknown as number)}</Text></div>
                  <Tag color="green" style={{ marginTop: 2 }}>×{p.quantity}</Tag>
                </div>
                {isSel && <CheckCircleFilled style={{ color: '#1677ff', fontSize: 22, position: 'absolute', top: 8, right: 8 }} />}
              </div>
              {p.description && (
                <div onClick={e => { e.stopPropagation(); setExpandedId(expandedId === p.id ? null : p.id); }}>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>{t('common.details')} ▾</Text>
                  {expandedId === p.id && <Text type="secondary" style={{ fontSize: 12 }}>{p.description}</Text>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected.size > 0 && (
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '10px 0', marginTop: 8, borderTop: '1px solid #f0f0f0' }}>
          <Button type="primary" block size="large" onClick={() => setView('order')}>
            {t('mobile.proceed_to_order', { count: selected.size })}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: 12 }}>
      <Button icon={<MinusOutlined />} onClick={() => setView('browse')} style={{ marginBottom: 10 }}>
        {t('mobile.back_to_list')}
      </Button>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('common.warehouse')}</Text>
      <Input prefix={<SearchOutlined />} placeholder={t('mobile.search_warehouse')} value={warehouseSearch}
        onChange={e => setWarehouseSearch(e.target.value)} style={{ marginBottom: 6 }} />
      <Select style={{ width: '100%', marginBottom: 14 }} value={warehouseId ?? undefined}
        onChange={v => setWarehouseId(v)} placeholder={t('common.warehouse')}>
        {filteredWarehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
      </Select>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {orderItems.map(({ product: p, qty }) => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            {p.image && <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6 }} />}
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
            </div>
            <Space>
              <Button size="small" icon={<MinusOutlined />} onClick={() => setQtys(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? 1) - 1) }))} />
              <InputNumber min={1} size="small" value={qty} style={{ width: 52 }} onChange={v => setQtys(q => ({ ...q, [p.id]: v ?? 1 }))} />
              <Button size="small" icon={<PlusOutlined />} onClick={() => setQtys(q => ({ ...q, [p.id]: (q[p.id] ?? 1) + 1 }))} />
              <Button size="small" danger onClick={() => toggle(p.id)}>✕</Button>
            </Space>
          </div>
        ))}
      </div>

      <Input.TextArea rows={2} placeholder={t('common.notes')} value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 8 }} />
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 12, marginBottom: 12 }}>
        <Text strong>{t('common.total')}: </Text>
        <Text strong style={{ color: '#1677ff', fontSize: 16 }}>{formatCurrency(total)}</Text>
      </div>
      <Button type="primary" block size="large" loading={createMutation.isPending} onClick={handleOrder}>
        {t('user_invoices.create_pickup')}
      </Button>
    </div>
  );
};

/* ══════════════════════════════════════
   PICKUPS LIST
══════════════════════════════════════ */
const PickupsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [warehouseFilter, setWarehouseFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'unprinted'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);
  const [scanTarget, setScanTarget] = useState<QRVerifyTarget | null>(null);

  const { data: pickups = [], isLoading } = useQuery({
    queryKey: ['my-pickups', user?.id],
    queryFn: () => filterUserInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: userReturns = [] } = useQuery({ queryKey: ['user-returns'], queryFn: getUserReturns });

  const markPrinted = useMutation({
    mutationFn: markUserInvoicePrinted,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-pickups'] }),
  });

  const myReturns = userReturns.filter(r => r.user.id === user?.id);

  const filtered = pickups
    .filter(p => !warehouseFilter || p.warehouse.id === warehouseFilter)
    .filter(p => statusFilter === 'unpaid' ? !p.paid : statusFilter === 'unprinted' ? !p.printed : true);

  const toPrint = (r: UserInvoice): PrintInvoiceData => ({
    id: r.id, type: 'uinv', date: r.date,
    warehouseId: r.warehouse.id, warehouseTitle: r.warehouse.title,
    userId: r.user.id, userFullname: r.user.fullname,
    totalPrice: r.totalPrice, notes: r.notes,
    products: r.products.map(p => ({ productName: p.productName, quantity: p.quantity, unitPrice: p.unitPrice })),
  });

  return (
    <div style={{ padding: 12 }}>
      <Space style={{ marginBottom: 10, flexWrap: 'wrap' }} size={6}>
        <Select placeholder={t('common.all')} allowClear style={{ width: 140 }}
          value={warehouseFilter} onChange={setWarehouseFilter}>
          {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
        </Select>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}>
          <Select.Option value="all">{t('common.all')}</Select.Option>
          <Select.Option value="unpaid">{t('common.unpaid')}</Select.Option>
          <Select.Option value="unprinted">{t('invoices.not_printed')}</Select.Option>
        </Select>
      </Space>

      {isLoading && <div style={{ textAlign: 'center', padding: 20 }}>{t('common.loading')}</div>}
      {!isLoading && filtered.length === 0 && <Empty />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(inv => {
          const invReturns = myReturns.filter(r => r.userInvoiceId === inv.id);
          const isOpen = expandedId === inv.id;
          return (
            <div key={inv.id} style={{ ...card, borderLeft: `3px solid ${inv.paid ? '#52c41a' : '#fa8c16'}` }}>
              <div onClick={() => setExpandedId(isOpen ? null : inv.id)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{inv.warehouse.title}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(inv.date).format('DD.MM.YYYY HH:mm')}</Text></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><Text strong style={{ color: '#1677ff' }}>{formatCurrency(inv.totalPrice)}</Text></div>
                    <Space size={3}>
                      <Tag color={inv.paid ? 'green' : 'orange'} style={{ fontSize: 10, margin: 0 }}>
                        {inv.paid ? t('common.paid') : t('common.unpaid')}
                      </Tag>
                      {inv.printed
                        ? <Tag color="green" style={{ fontSize: 10, margin: 0 }}>{t('invoices.printed')}</Tag>
                        : <Tag style={{ fontSize: 10, margin: 0 }}>{t('invoices.not_printed')}</Tag>}
                    </Space>
                  </div>
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}>
                  {inv.products.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                      <span>{p.productName} ×{p.quantity}</span>
                      <span>{formatCurrency(p.unitPrice * p.quantity)}</span>
                    </div>
                  ))}
                  {invReturns.length > 0 && (
                    <>
                      <Divider style={{ margin: '6px 0' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('menu.warehouse_returns')}:</Text>
                      {invReturns.map(r => (
                        <div key={r.id} style={{ fontSize: 12 }}>
                          {dayjs(r.date).format('DD.MM.YY')} — {r.productName} ×{r.quantity}
                        </div>
                      ))}
                    </>
                  )}
                  <Space style={{ marginTop: 8 }} wrap>
                    <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintData(toPrint(inv))}>{t('invoices.print')}</Button>
                    {!inv.printed && (
                      <Button size="small" icon={<ScanOutlined />} onClick={() => setScanTarget({
                        type: 'uinv', id: inv.id, warehouseId: inv.warehouse.id, userId: inv.user.id, total: inv.totalPrice,
                      })}>{t('invoices.scan_qr')}</Button>
                    )}
                  </Space>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <InvoicePrintModal open={!!printData} data={printData} onClose={() => setPrintData(null)} />
      <QRScannerModal open={!!scanTarget} target={scanTarget}
        onVerified={() => scanTarget && markPrinted.mutate(scanTarget.id)}
        onClose={() => setScanTarget(null)} />
    </div>
  );
};

/* ══════════════════════════════════════
   ADMIN PAYMENTS (user → admin)
══════════════════════════════════════ */
const AdminPaymentsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: payments = [] } = useQuery({
    queryKey: ['user-payments-by-user', user?.id],
    queryFn: () => getUserPaymentsByUser(user!.id),
    enabled: !!user?.id,
  });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const [whFilter, setWhFilter] = useState<number | undefined>();

  const filtered = payments.filter(p => !whFilter || (p as unknown as { warehouseId?: number }).warehouseId === whFilter);

  return (
    <div style={{ padding: 12 }}>
      <Select placeholder={t('common.all')} allowClear style={{ width: '100%', marginBottom: 10 }}
        value={whFilter} onChange={setWhFilter}>
        {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
      </Select>
      {filtered.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(p.date).format('DD.MM.YYYY')}</Text>
              <div><Tag>{p.paymentMethod}</Tag></div>
              {p.description && <Text type="secondary" style={{ fontSize: 11 }}>{p.description}</Text>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text strong style={{ color: '#1677ff', fontSize: 15 }}>{formatCurrency(p.amount)}</Text>
              <div>
                {p.accepted
                  ? <Tag color="green" style={{ fontSize: 10 }}>{t('common.accepted')}</Tag>
                  : <Tag color="orange" style={{ fontSize: 10 }}>{t('common.pending')}</Tag>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   EXPENSES
══════════════════════════════════════ */
const ExpensesSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string | undefined>();
  const [approvedFilter, setApprovedFilter] = useState<'all' | 'approved' | 'unapproved'>('all');
  const [form, setForm] = useState<Partial<ExpenseRequest>>({});

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-user', user?.id],
    queryFn: () => getExpensesByUser(user!.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses-user'] }); message.success(t('expenses.expense_created')); setModalOpen(false); setForm({}); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses-user'] }),
  });

  const filtered = expenses
    .filter(e => !catFilter || e.category === catFilter)
    .filter(e => approvedFilter === 'approved' ? e.approved : approvedFilter === 'unapproved' ? !e.approved : true);

  const handleCreate = () => {
    if (!form.description || !form.total || !form.date) { message.error(t('common.required')); return; }
    createMut.mutate({ ...form as ExpenseRequest, userId: user!.id });
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <Space size={6} wrap>
          <Select placeholder={t('common.all')} allowClear style={{ width: 120 }} value={catFilter} onChange={setCatFilter}>
            {EXPENSE_CATEGORIES.map(c => <Select.Option key={c} value={c}>{t(`expenses.categories.${c.toLowerCase()}`)}</Select.Option>)}
          </Select>
          <Select value={approvedFilter} onChange={setApprovedFilter} style={{ width: 120 }}>
            <Select.Option value="all">{t('common.all')}</Select.Option>
            <Select.Option value="approved">{t('expenses.approved')}</Select.Option>
            <Select.Option value="unapproved">{t('expenses.pending')}</Select.Option>
          </Select>
        </Space>
        <Button type="primary" size="small" onClick={() => setModalOpen(true)}>{t('expenses.add_expense')}</Button>
      </div>
      {filtered.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(e => (
          <div key={e.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13 }}>{e.description}</Text>
              <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(e.date).format('DD.MM.YYYY')}</Text>{e.category && <Tag style={{ marginLeft: 4, fontSize: 10 }}>{e.category}</Tag>}</div>
              {e.approved
                ? <Tag color="green" style={{ fontSize: 10 }}>{t('expenses.approved')}</Tag>
                : <Tag color="orange" style={{ fontSize: 10 }}>{t('expenses.pending')}</Tag>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text strong style={{ color: '#1677ff' }}>{formatCurrency(e.total)}</Text>
              {!e.approved && (
                <div>
                  <Button size="small" danger style={{ fontSize: 11, marginTop: 4 }} onClick={() => deleteMut.mutate(e.id)}>✕</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal title={t('expenses.add_expense')} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} destroyOnHidden>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input placeholder={t('common.description')} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <InputNumber placeholder={t('common.amount')} style={{ width: '100%' }} value={form.total} onChange={v => setForm(f => ({ ...f, total: v ?? 0 }))} />
          <DatePicker style={{ width: '100%' }} onChange={d => setForm(f => ({ ...f, date: d ? dayjs(d).format('YYYY-MM-DD') : undefined }))} />
          <Select placeholder={t('expenses.category')} value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))}>
            {EXPENSE_CATEGORIES.map(c => <Select.Option key={c} value={c}>{t(`expenses.categories.${c.toLowerCase()}`)}</Select.Option>)}
          </Select>
          <Button type="primary" loading={createMut.isPending} onClick={handleCreate}>{t('common.create')}</Button>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   WAREHOUSE RETURNS
══════════════════════════════════════ */
const WarehouseReturnsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [whFilter, setWhFilter] = useState<number | undefined>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [wizardWarehouse, setWizardWarehouse] = useState<Warehouse | null>(null);
  const [wizardInvoice, setWizardInvoice] = useState<UserInvoice | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [desc, setDesc] = useState('');

  const { data: userReturns = [] } = useQuery({ queryKey: ['user-returns'], queryFn: getUserReturns });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
  const { data: myPickups = [] } = useQuery({
    queryKey: ['my-pickups', user?.id],
    queryFn: () => filterUserInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (reqs: UserReturnRequest[]) => Promise.all(reqs.map(createUserReturn)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-returns'] });
      message.success(t('returns.return_created'));
      setWizardOpen(false); setStep(0); setWizardWarehouse(null); setWizardInvoice(null); setReturnQtys({}); setDesc('');
    },
  });

  const myReturns = userReturns.filter(r => r.user.id === user?.id);
  const filtered = myReturns.filter(r => !whFilter || r.warehouseId === whFilter);
  const last5Unpaid = myPickups.filter(i => !i.paid && (!wizardWarehouse || i.warehouse.id === wizardWarehouse.id)).slice(-5).reverse();

  const handleSubmit = () => {
    if (!wizardInvoice || !wizardWarehouse) return;
    const reqs: UserReturnRequest[] = wizardInvoice.products
      .filter(p => (returnQtys[p.productId] ?? 0) > 0)
      .map(p => ({
        productId: p.productId,
        warehouseId: wizardWarehouse.id,
        userId: user!.id,
        userInvoiceId: wizardInvoice.id,
        quantity: returnQtys[p.productId],
        description: desc,
      }));
    if (!reqs.length) { message.error(t('returns.add_qty')); return; }
    createMutation.mutate(reqs);
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <Select placeholder={t('common.all')} allowClear style={{ width: '55%' }} value={whFilter} onChange={setWhFilter}>
          {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.title}</Select.Option>)}
        </Select>
        <Button type="primary" icon={<RollbackOutlined />} onClick={() => { setWizardOpen(true); setStep(0); }}>
          {t('mobile.new_return')}
        </Button>
      </div>

      {filtered.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(r => (
          <div key={r.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Text strong style={{ fontSize: 13 }}>{r.productName}</Text>
              <div><Text type="secondary" style={{ fontSize: 11 }}>{r.warehouseTitle} • {dayjs(r.date).format('DD.MM.YY')}</Text></div>
              {r.description && <Text type="secondary" style={{ fontSize: 11 }}>{r.description}</Text>}
            </div>
            <Tag color="red">×{r.quantity}</Tag>
          </div>
        ))}
      </div>

      <Modal title={t('mobile.new_return')} open={wizardOpen} onCancel={() => { setWizardOpen(false); setStep(0); }} footer={null} destroyOnHidden>
        <Steps current={step} size="small" style={{ marginBottom: 16 }} items={[
          { title: t('common.warehouse') },
          { title: t('mobile.select_invoice') },
          { title: t('common.products') },
        ]} />

        {step === 0 && (
          <>
            <Text style={{ display: 'block', marginBottom: 8 }}>{t('mobile.select_warehouse_first')}</Text>
            {warehouses.map(w => (
              <div key={w.id} onClick={() => { setWizardWarehouse(w); setStep(1); }} style={{
                padding: 10, background: '#f0f4ff', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
              }}>
                <Text strong>{w.title}</Text>
              </div>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Button size="small" onClick={() => setStep(0)} style={{ marginBottom: 10 }}>{t('common.back')}</Button>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('mobile.last5_unpaid')}</Text>
            {last5Unpaid.length === 0 && <Empty description={t('mobile.no_unpaid_invoices')} />}
            {last5Unpaid.map(inv => (
              <div key={inv.id} onClick={() => { setWizardInvoice(inv); setReturnQtys({}); setStep(2); }} style={{
                padding: 10, background: '#f0f4ff', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 13 }}>#{inv.id} — {inv.warehouse.title}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(inv.date).format('DD.MM.YY')}</Text>
                </div>
                <Text style={{ fontSize: 12 }}>{formatCurrency(inv.totalPrice)}</Text>
              </div>
            ))}
          </>
        )}

        {step === 2 && wizardInvoice && (
          <>
            <Button size="small" onClick={() => setStep(1)} style={{ marginBottom: 10 }}>{t('common.back')}</Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              {t('mobile.invoice_of')} #{wizardInvoice.id}
            </Text>
            {wizardInvoice.products.map(p => (
              <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <Text style={{ fontSize: 13 }}>{p.productName}</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('common.qty')}: {p.quantity}</Text>
                </div>
                <InputNumber min={0} max={p.quantity} size="small" style={{ width: 70 }}
                  value={returnQtys[p.productId] ?? 0}
                  onChange={v => setReturnQtys(q => ({ ...q, [p.productId]: v ?? 0 }))} />
              </div>
            ))}
            <Input.TextArea rows={2} placeholder={t('common.notes')} value={desc} onChange={e => setDesc(e.target.value)} style={{ marginBottom: 10 }} />
            <Button type="primary" block loading={createMutation.isPending} onClick={handleSubmit}>
              {t('returns.submit_return')}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   WAREHOUSE TAB ROOT
══════════════════════════════════════ */
const WarehouseTab: React.FC = () => {
  const [sub, setSub] = useState<SubTab>('products');
  const { t } = useTranslation();

  const subTabs = [
    { key: 'products' as SubTab,  label: t('menu.products') },
    { key: 'pickups' as SubTab,   label: t('user_invoices.my_pickups_title') },
    { key: 'payments' as SubTab,  label: t('menu.payments') },
    { key: 'expenses' as SubTab,  label: t('menu.my_expenses') },
    { key: 'returns' as SubTab,   label: t('menu.warehouse_returns') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SubTabBar tabs={subTabs} active={sub} onChange={setSub} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sub === 'products'  && <WarehouseProductsSection />}
        {sub === 'pickups'   && <PickupsSection />}
        {sub === 'payments'  && <AdminPaymentsSection />}
        {sub === 'expenses'  && <ExpensesSection />}
        {sub === 'returns'   && <WarehouseReturnsSection />}
      </div>
    </div>
  );
};

export default WarehouseTab;
