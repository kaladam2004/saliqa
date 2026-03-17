import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Divider, Empty,
  Input, InputNumber, message, Modal, Select, Space, Spin, Steps, Tag, Typography,
} from 'antd';
import {
  CheckCircleFilled, MinusOutlined, PlusOutlined, PrinterOutlined,
  RollbackOutlined, ScanOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { filterInvoices, markInvoicePrinted } from '../../../api/invoices';
import { createInvoice } from '../../../api/invoices';
import { getPaymentsByUser } from '../../../api/payments';
import { getReturns, createReturn } from '../../../api/returns';
import { getShops } from '../../../api/shops';
import { getRepProducts } from '../../../api/userInvoices';
import type {
  Invoice, Product, ReturnProductItem, Shop,
} from '../../../types';
import { formatCurrency } from '../../../utils/helpers';
import InvoicePrintModal, { type PrintInvoiceData } from '../../../components/common/InvoicePrintModal';
import QRScannerModal, { type QRVerifyTarget } from '../../../components/common/QRScannerModal';

const { Text } = Typography;

type SubTab = 'products' | 'invoices' | 'payments' | 'returns';

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

/* ─── helpers ─── */
const statusColor = (paid: boolean) => paid ? 'green' : 'orange';

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
   PRODUCTS SHOWCASE (multi-stage wizard)
══════════════════════════════════════ */
const ProductsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [view, setView] = useState<'browse' | 'order'>('browse');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<Map<number, Product>>(new Map());
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [shopSearch, setShopSearch] = useState('');
  const [shopId, setShopId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* debounce search → server */
  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  }, []);

  const {
    data: repProductPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['rep-products', user?.id, debouncedSearch],
    queryFn: ({ pageParam = 0 }) => getRepProducts(user!.id, debouncedSearch, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last) => last.last ? undefined : last.number + 1,
    enabled: !!user?.id,
  });

  const showcaseProducts: Product[] = useMemo(
    () => repProductPages?.pages.flatMap(p => p.content) ?? [],
    [repProductPages],
  );

  /* infinite scroll */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });

  const filteredShops = shops.filter(s =>
    s.shopkeeper?.id === user?.id &&
    s.title.toLowerCase().includes(shopSearch.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-invoices'] });
      message.success(t('invoices.invoice_created'));
      setView('browse'); setSelected(new Map()); setQtys({}); setShopId(null);
    },
  });

  const orderItems = useMemo(() =>
    Array.from(selected.values()).map(p => ({ product: p, qty: qtys[p.id] ?? 1 })),
    [selected, qtys],
  );

  const total = orderItems.reduce((s, i) => s + (i.product.price as unknown as number) * i.qty, 0);

  const toggle = (p: Product) => setSelected(prev => {
    const n = new Map(prev);
    n.has(p.id) ? n.delete(p.id) : n.set(p.id, p);
    return n;
  });

  const handleOrder = () => {
    if (!shopId) { message.error(t('mobile.select_shop_first')); return; }
    createMutation.mutate({
      shopId,
      userId: user!.id,
      free: false,
      products: orderItems.map(i => ({ productId: i.product.id, quantity: i.qty, unitPrice: i.product.price as unknown as number })),
    });
  };

  /* ── Browse view ── */
  if (view === 'browse') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 12px 0' }}>
        <Input prefix={<SearchOutlined />} placeholder={t('mobile.search_products')} value={searchInput}
          onChange={e => handleSearchChange(e.target.value)} style={{ marginBottom: 10 }} allowClear
          onClear={() => handleSearchChange('')} />
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        {isLoading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}
        {!isLoading && showcaseProducts.length === 0 && <Empty description={t('mobile.no_products')} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {showcaseProducts.map(p => {
            const isSel = selected.has(p.id);
            return (
              <div key={p.id} onClick={() => toggle(p)} style={{
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14 }}>{p.name}</Text>
                    <div><Text style={{ color: '#1677ff', fontWeight: 600 }}>{formatCurrency(p.price as unknown as number)}</Text></div>
                    <div><Tag color={p.quantity > 0 ? 'green' : 'red'} style={{ marginTop: 2 }}>×{p.quantity}</Tag></div>
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
        {isFetchingNextPage && <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>}
      </div>
      {selected.size > 0 && (
        <div style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          <Button type="primary" block size="large" onClick={() => setView('order')}>
            {t('mobile.proceed_to_order', { count: selected.size })}
          </Button>
        </div>
      )}
    </div>
  );

  /* ── Order view ── */
  return (
    <div style={{ padding: 12 }}>
      <Button icon={<MinusOutlined />} onClick={() => setView('browse')} style={{ marginBottom: 10 }}>
        {t('mobile.back_to_list')}
      </Button>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('common.shop')}</Text>
      <Input prefix={<SearchOutlined />} placeholder={t('mobile.search_shop')} value={shopSearch}
        onChange={e => setShopSearch(e.target.value)} style={{ marginBottom: 6 }} />
      <Select style={{ width: '100%', marginBottom: 14 }} value={shopId ?? undefined}
        onChange={v => setShopId(v)} placeholder={t('shops.select_user')}>
        {filteredShops.map(s => (
          <Select.Option key={s.id} value={s.id}>
            {s.image && <img src={imgSrc(s.image)!} alt={s.title} style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 3, marginRight: 6 }} />}
            {s.title}
          </Select.Option>
        ))}
      </Select>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {orderItems.map(({ product: p, qty }) => (
          <div key={p.id} style={{ ...card, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            {p.image && <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }} />}
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
              <div><Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency((p.price as unknown as number) * qty)}</Text></div>
            </div>
            <Space>
              <Button size="small" icon={<MinusOutlined />} onClick={() => setQtys(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? 1) - 1) }))} />
              <InputNumber min={1} size="small" value={qty} style={{ width: 52 }} onChange={v => setQtys(q => ({ ...q, [p.id]: v ?? 1 }))} />
              <Button size="small" icon={<PlusOutlined />} onClick={() => setQtys(q => ({ ...q, [p.id]: (q[p.id] ?? 1) + 1 }))} />
              <Button size="small" danger onClick={() => { toggle(p); }}>✕</Button>
            </Space>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <Text strong>{t('common.total')}: </Text>
        <Text strong style={{ color: '#1677ff', fontSize: 16 }}>{formatCurrency(total)}</Text>
      </div>

      <Button type="primary" block size="large" loading={createMutation.isPending} onClick={handleOrder}>
        {t('invoices.create_invoice')}
      </Button>
    </div>
  );
};

/* ══════════════════════════════════════
   INVOICES LIST
══════════════════════════════════════ */
const InvoicesSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [shopFilter, setShopFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'unprinted'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [printData, setPrintData] = useState<PrintInvoiceData | null>(null);
  const [scanTarget, setScanTarget] = useState<QRVerifyTarget | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-invoices', user?.id],
    queryFn: () => filterInvoices({ userId: user!.id }),
    enabled: !!user?.id,
  });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: allReturns = [] } = useQuery({ queryKey: ['returns'], queryFn: getReturns });

  const markPrinted = useMutation({
    mutationFn: markInvoicePrinted,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-invoices'] }),
  });

  const myShops = shops.filter(s => s.shopkeeper?.id === user?.id);
  const myReturns = allReturns.filter(r => r.user.id === user?.id);

  const filtered = invoices
    .filter(i => !shopFilter || i.shop.id === shopFilter)
    .filter(i => statusFilter === 'unpaid' ? !i.paid : statusFilter === 'unprinted' ? !i.printed : true);

  const toPrint = (r: Invoice): PrintInvoiceData => ({
    id: r.id, type: 'inv', date: r.date, shopId: r.shop.id,
    shopTitle: r.shop.title, userId: r.user.id, userFullname: r.user.fullname,
    totalPrice: r.totalPrice, notes: r.notes,
    products: r.products.map(p => ({ productName: p.productName, quantity: p.quantity, unitPrice: p.unitPrice, totalPrice: p.totalPrice })),
  });

  return (
    <div style={{ padding: 12 }}>
      <Space style={{ marginBottom: 10, flexWrap: 'wrap' }} size={6}>
        <Select placeholder={t('common.all_shops')} allowClear style={{ width: 140 }}
          value={shopFilter} onChange={setShopFilter}>
          {myShops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
        </Select>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}>
          <Select.Option value="all">{t('common.all')}</Select.Option>
          <Select.Option value="unpaid">{t('common.unpaid')}</Select.Option>
          <Select.Option value="unprinted">{t('invoices.not_printed')}</Select.Option>
        </Select>
      </Space>

      {isLoading && <div style={{ textAlign: 'center', padding: 20 }}>{t('common.loading')}</div>}
      {!isLoading && filtered.length === 0 && <Empty description={t('invoices.no_invoices')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(inv => {
          const invReturns = myReturns.filter(r => r.invoiceId === inv.id);
          const isOpen = expandedId === inv.id;
          return (
            <div key={inv.id} style={{ ...card, borderLeft: `3px solid ${inv.paid ? '#52c41a' : '#fa8c16'}` }}>
              <div onClick={() => setExpandedId(isOpen ? null : inv.id)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{inv.shop.title}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(inv.date).format('DD.MM.YYYY HH:mm')}</Text></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><Text strong style={{ color: '#1677ff' }}>{inv.free ? <Tag color="blue">{t('common.free')}</Tag> : formatCurrency(inv.totalPrice)}</Text></div>
                    <Space size={3}>
                      <Tag color={statusColor(inv.paid)} style={{ fontSize: 10, margin: 0 }}>{inv.paid ? t('common.paid') : t('common.unpaid')}</Tag>
                      {inv.printed ? <Tag color="green" style={{ fontSize: 10, margin: 0 }}>{t('invoices.printed')}</Tag>
                        : <Tag style={{ fontSize: 10, margin: 0 }}>{t('invoices.not_printed')}</Tag>}
                    </Space>
                  </div>
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}>
                  {inv.products.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                      <span>{p.productName} ×{p.quantity}</span>
                      <span>{formatCurrency(p.totalPrice)}</span>
                    </div>
                  ))}
                  {inv.payments.length > 0 && (
                    <>
                      <Divider style={{ margin: '6px 0' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('menu.payments')}:</Text>
                      {inv.payments.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span>{dayjs(p.paidAt).format('DD.MM.YY')}</span>
                          <span>{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {invReturns.length > 0 && (
                    <>
                      <Divider style={{ margin: '6px 0' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('menu.returns')}:</Text>
                      {invReturns.map(r => (
                        <div key={r.id} style={{ fontSize: 12 }}>
                          {dayjs(r.date).format('DD.MM.YY')} — {r.products.map(p => `${p.productName} ×${p.quantity}`).join(', ')}
                        </div>
                      ))}
                    </>
                  )}
                  <Space style={{ marginTop: 8 }} wrap>
                    <Button size="small" icon={<PrinterOutlined />} onClick={() => setPrintData(toPrint(inv))}>{t('invoices.print')}</Button>
                    {!inv.printed && (
                      <Button size="small" icon={<ScanOutlined />} onClick={() => setScanTarget({
                        type: 'inv', id: inv.id, shopId: inv.shop.id, userId: inv.user.id, total: inv.totalPrice,
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
   PAYMENTS (shop → user collected)
══════════════════════════════════════ */
const PaymentsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [shopFilter, setShopFilter] = useState<number | undefined>();

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-by-user', user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user?.id,
  });

  const myShops = shops.filter(s => s.shopkeeper?.id === user?.id);
  const filtered = payments.filter(p => !shopFilter || p.shopId === shopFilter);

  return (
    <div style={{ padding: 12 }}>
      <Select placeholder={t('common.all_shops')} allowClear style={{ width: '100%', marginBottom: 10 }}
        value={shopFilter} onChange={setShopFilter}>
        {myShops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
      </Select>
      {filtered.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ ...card, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: 13 }}>{p.shopTitle}</Text>
              <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(p.paidAt).format('DD.MM.YYYY')}</Text></div>
              <Tag style={{ marginTop: 4 }}>{p.paymentMethod}</Tag>
            </div>
            <Text strong style={{ color: '#52c41a', fontSize: 15 }}>{formatCurrency(p.amount)}</Text>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   RETURNS (shop returns)
══════════════════════════════════════ */
const ReturnsSection: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [shopFilter, setShopFilter] = useState<number | undefined>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [wizardShop, setWizardShop] = useState<Shop | null>(null);
  const [wizardInvoice, setWizardInvoice] = useState<Invoice | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [desc, setDesc] = useState('');

  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: allReturns = [] } = useQuery({ queryKey: ['returns'], queryFn: getReturns });

  const { data: shopInvoices = [] } = useQuery({
    queryKey: ['invoices-for-return', wizardShop?.id, user?.id],
    queryFn: () => filterInvoices({ shopId: wizardShop!.id, userId: user!.id }),
    enabled: !!wizardShop && !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: createReturn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      message.success(t('returns.return_created'));
      setWizardOpen(false); setStep(0); setWizardShop(null); setWizardInvoice(null); setReturnQtys({}); setDesc('');
    },
  });

  const myShops = shops.filter(s => s.shopkeeper?.id === user?.id);
  const myReturns = allReturns.filter(r => r.user.id === user?.id);
  const filtered = myReturns.filter(r => !shopFilter || r.shop.id === shopFilter);

  const last5Unpaid = shopInvoices.filter(i => !i.paid).slice(-5).reverse();

  const handleSubmitReturn = () => {
    if (!wizardInvoice || !wizardShop) return;
    const products: ReturnProductItem[] = wizardInvoice.products
      .filter(p => (returnQtys[p.productId] ?? 0) > 0)
      .map(p => ({ productId: p.productId, quantity: returnQtys[p.productId] }));
    if (!products.length) { message.error(t('returns.add_qty')); return; }
    createMutation.mutate({ userId: user!.id, shopId: wizardShop.id, invoiceId: wizardInvoice.id, description: desc, products });
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <Select placeholder={t('common.all_shops')} allowClear style={{ width: '60%' }}
          value={shopFilter} onChange={setShopFilter}>
          {myShops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
        </Select>
        <Button type="primary" icon={<RollbackOutlined />} onClick={() => { setWizardOpen(true); setStep(0); }}>
          {t('mobile.new_return')}
        </Button>
      </div>

      {filtered.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(r => (
          <div key={r.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 13 }}>{r.shop.title}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(r.date).format('DD.MM.YYYY')}</Text>
            </div>
            <div style={{ marginTop: 4 }}>
              {r.products.map(p => (
                <Text key={p.productId} type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {p.productName} ×{p.quantity}
                </Text>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Return wizard modal */}
      <Modal title={t('mobile.new_return')} open={wizardOpen} onCancel={() => { setWizardOpen(false); setStep(0); }} footer={null} destroyOnHidden>
        <Steps current={step} size="small" style={{ marginBottom: 16 }} items={[
          { title: t('common.shop') },
          { title: t('mobile.select_invoice') },
          { title: t('common.products') },
        ]} />

        {step === 0 && (
          <>
            <Text style={{ display: 'block', marginBottom: 8 }}>{t('mobile.select_shop_first')}</Text>
            {myShops.map(s => (
              <div key={s.id} onClick={() => { setWizardShop(s); setStep(1); }} style={{
                padding: 10, background: '#f0f4ff', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
              }}>
                <Text strong>{s.title}</Text>
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
                  <Text strong style={{ fontSize: 13 }}>#{inv.id}</Text>
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
              {t('mobile.invoice_of')} #{wizardInvoice.id} — {wizardShop?.title}
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
            <Button type="primary" block loading={createMutation.isPending} onClick={handleSubmitReturn}>
              {t('returns.submit_return')}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   TASKS TAB ROOT
══════════════════════════════════════ */
const TasksTab: React.FC = () => {
  const [sub, setSub] = useState<SubTab>('products');
  const { t } = useTranslation();

  const subTabs = [
    { key: 'products' as SubTab,  label: t('menu.products') },
    { key: 'invoices' as SubTab,  label: t('menu.invoices') },
    { key: 'payments' as SubTab,  label: t('menu.payments') },
    { key: 'returns' as SubTab,   label: t('menu.returns') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SubTabBar tabs={subTabs} active={sub} onChange={setSub} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sub === 'products'  && <ProductsSection />}
        {sub === 'invoices'  && <InvoicesSection />}
        {sub === 'payments'  && <PaymentsSection />}
        {sub === 'returns'   && <ReturnsSection />}
      </div>
    </div>
  );
};

export default TasksTab;
