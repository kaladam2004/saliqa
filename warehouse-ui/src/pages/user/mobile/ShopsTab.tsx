import React, { useMemo, useState } from 'react';
import {
  Button, Empty, Input, InputNumber, message,
  Modal, Select, Space, Steps, Tag, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, DollarOutlined, EnvironmentOutlined,
  MinusOutlined, PhoneOutlined, PlusOutlined, PrinterOutlined,
  RollbackOutlined, ScanOutlined, SearchOutlined, ShopOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { filterInvoices, createInvoice, markInvoicePrinted } from '../../../api/invoices';
import { getPaymentsByUser, createPayment, bulkCollectPayment } from '../../../api/payments';
import { getReturns, createReturn } from '../../../api/returns';
import { getRepProducts } from '../../../api/userInvoices';
import { getShops } from '../../../api/shops';
import type { Invoice, Shop, PaymentMethod } from '../../../types';
import { formatCurrency } from '../../../utils/helpers';
import { type PrintInvoiceData } from '../../../components/common/InvoicePrintModal';
import { downloadInvoicePDF } from '../../../utils/mobilePrint';
import QRScannerModal, { type QRVerifyTarget } from '../../../components/common/QRScannerModal';

const { Text } = Typography;

/* ─── localStorage helpers ─── */
const RECENT_KEY = 'recent_shops';
const getRecentIds = (): number[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const addRecentId = (id: number) => {
  const prev = getRecentIds().filter(x => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, 5)));
};

/* ─── Design tokens ─── */
const card = {
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  overflow: 'hidden',
} as const;

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : '/api' + url;

type ShopTab = 'invoices' | 'payments' | 'returns';
type InvFilter = 'all' | 'unpaid' | 'unprinted';

/* ══════════════════════════════════════
   PAYMENT MODAL
══════════════════════════════════════ */
const PaymentModal: React.FC<{
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, invoice, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [desc, setDesc] = useState('');

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      message.success(t('payments.payment_created'));
      onSuccess();
      onClose();
      setAmount(0); setDesc('');
    },
    onError: () => message.error(t('common.error')),
  });

  return (
    <Modal
      title={`${t('payments.record_payment')} — #${invoice?.id}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#f8faff', borderRadius: 10, padding: '10px 14px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('invoices.total')}</Text>
          <div><Text strong style={{ fontSize: 18, color: '#1677ff' }}>{formatCurrency(invoice?.totalPrice ?? 0)}</Text></div>
        </div>
        <InputNumber
          placeholder={t('common.amount')}
          style={{ width: '100%' }}
          value={amount || undefined}
          onChange={v => setAmount(v ?? 0)}
          min={0}
        />
        <Select value={method} onChange={v => setMethod(v as PaymentMethod)} style={{ width: '100%' }}>
          <Select.Option value="CASH">{t('payments.cash')}</Select.Option>
          <Select.Option value="CARD">{t('payments.card')}</Select.Option>
          <Select.Option value="TRANSFER">{t('payments.transfer')}</Select.Option>
        </Select>
        <Input.TextArea
          rows={2}
          placeholder={t('common.description')}
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <Button
          type="primary" block size="large"
          loading={mutation.isPending}
          disabled={!amount || amount <= 0}
          onClick={() => {
            if (!invoice || !user) return;
            mutation.mutate({
              invoiceId: invoice.id,
              userId: user.id,
              amount,
              paymentMethod: method,
              description: desc || undefined,
            } as any);
          }}
        >
          {t('payments.record_payment')}
        </Button>
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════
   CREATE INVOICE WIZARD
══════════════════════════════════════ */
const CreateInvoiceModal: React.FC<{
  open: boolean;
  shop: Shop;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, shop, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  const { data: productPage } = useQuery({
    queryKey: ['rep-products', user?.id, search],
    queryFn: () => getRepProducts(user!.id, search, 0, 50),
    enabled: !!user?.id && open,
  });

  const products = productPage?.content ?? [];

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      message.success(t('invoices.invoice_created'));
      onSuccess();
      onClose();
      setStep(0); setSelected(new Set()); setQtys({}); setNotes('');
    },
    onError: () => message.error(t('common.error')),
  });

  const orderItems = useMemo(() =>
    Array.from(selected).map(id => ({ product: products.find(p => p.id === id)!, qty: qtys[id] ?? 1 })).filter(i => i.product),
    [selected, products, qtys]
  );

  const total = orderItems.reduce((s, i) => s + Number(i.product.price) * i.qty, 0);

  const toggle = (id: number) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleSubmit = () => {
    if (!user) return;
    mutation.mutate({
      shopId: shop.id,
      userId: user.id,
      notes,
      products: orderItems.map(i => ({ productId: i.product.id, quantity: i.qty })),
    } as any);
  };

  return (
    <Modal
      title={t('invoices.create_invoice')}
      open={open}
      onCancel={() => { onClose(); setStep(0); setSelected(new Set()); setQtys({}); }}
      footer={null}
      destroyOnHidden
    >
      <Steps current={step} size="small" style={{ marginBottom: 16 }} items={[
        { title: t('menu.products') },
        { title: t('common.confirm') },
      ]} />

      {step === 0 && (
        <>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('mobile.search_products')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
            allowClear
          />
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.length === 0 && <Empty description={t('mobile.no_products')} />}
            {products.map(p => {
              const isSel = selected.has(p.id);
              return (
                <div key={p.id} onClick={() => toggle(p.id)} style={{
                  background: isSel ? '#f0f4ff' : '#fafafa',
                  border: `2px solid ${isSel ? '#1677ff' : 'transparent'}`,
                  borderRadius: 10, padding: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {p.image
                    ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, background: '#e0e7ff', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>}
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                    <div><Text style={{ color: '#1677ff', fontSize: 12 }}>{formatCurrency(Number(p.price))}</Text></div>
                  </div>
                  {isSel && (
                    <Space onClick={e => e.stopPropagation()}>
                      <Button size="small" icon={<MinusOutlined />} onClick={() => setQtys(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? 1) - 1) }))} />
                      <Text strong style={{ minWidth: 20, textAlign: 'center' }}>{qtys[p.id] ?? 1}</Text>
                      <Button size="small" icon={<PlusOutlined />} onClick={() => setQtys(q => ({ ...q, [p.id]: (q[p.id] ?? 1) + 1 }))} />
                    </Space>
                  )}
                </div>
              );
            })}
          </div>
          {selected.size > 0 && (
            <Button type="primary" block size="large" style={{ marginTop: 12 }} onClick={() => setStep(1)}>
              {t('common.next')} ({selected.size})
            </Button>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => setStep(0)} style={{ marginBottom: 12 }}>
            {t('common.back')}
          </Button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {orderItems.map(({ product: p, qty }) => (
              <div key={p.id} style={{ background: '#f8faff', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>×{qty} × {formatCurrency(Number(p.price))}</Text>
                </div>
                <Text strong style={{ color: '#1677ff' }}>{formatCurrency(Number(p.price) * qty)}</Text>
              </div>
            ))}
          </div>
          <Input.TextArea
            rows={2} placeholder={t('common.notes')}
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ background: '#1677ff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 600 }}>{t('invoices.total')}</Text>
            <Text style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{formatCurrency(total)}</Text>
          </div>
          <Button type="primary" block size="large" loading={mutation.isPending} onClick={handleSubmit}>
            ✓ {t('invoices.create_invoice')}
          </Button>
        </>
      )}
    </Modal>
  );
};

/* ══════════════════════════════════════
   INVOICES SECTION
══════════════════════════════════════ */
/* ══════════════════════════════════════
   BULK PAYMENT MODAL
══════════════════════════════════════ */
const BulkPaymentModal: React.FC<{
  open: boolean;
  shop: Shop;
  unpaidCount: number;
  totalDebt: number;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, shop, unpaidCount, totalDebt, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [desc, setDesc] = useState('');

  const mutation = useMutation({
    mutationFn: () => bulkCollectPayment({ shopId: shop.id, amount, paymentMethod: method, description: desc || undefined }),
    onSuccess: () => {
      message.success(t('wizards.bulk_collect.success_title'));
      onSuccess();
      onClose();
      setAmount(0); setDesc('');
    },
    onError: () => message.error(t('common.error')),
  });

  return (
    <Modal
      title={t('wizards.bulk_collect.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#fff7e6', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('wizards.bulk_collect.unpaid_invoices')}</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{unpaidCount}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{t('wizards.bulk_collect.total_debt')}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fa8c16' }}>{formatCurrency(totalDebt)}</div>
          </div>
        </div>
        <InputNumber
          placeholder={t('common.amount')}
          style={{ width: '100%' }}
          value={amount || undefined}
          onChange={v => setAmount(v ?? 0)}
          min={0}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {([totalDebt, Math.round(totalDebt / 2)] as number[]).map(preset => (
            <button key={preset} onClick={() => setAmount(preset)} style={{
              flex: 1, border: '1px solid #d9d9d9', borderRadius: 8, padding: '6px 0',
              background: amount === preset ? '#1677ff' : '#fafafa',
              color: amount === preset ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>
              {formatCurrency(preset)}
            </button>
          ))}
        </div>
        <Select value={method} onChange={v => setMethod(v as PaymentMethod)} style={{ width: '100%' }}>
          <Select.Option value="CASH">{t('payments.method_cash')}</Select.Option>
          <Select.Option value="CARD">{t('payments.method_card')}</Select.Option>
          <Select.Option value="TRANSFER">{t('payments.method_bank')}</Select.Option>
        </Select>
        <Input.TextArea rows={2} placeholder={t('common.description')} value={desc} onChange={e => setDesc(e.target.value)} />
        <Button
          type="primary" block size="large"
          loading={mutation.isPending}
          disabled={!amount || amount <= 0}
          onClick={() => mutation.mutate()}
        >
          {t('wizards.bulk_collect.confirm_btn', { amount: formatCurrency(amount) })}
        </Button>
      </div>
    </Modal>
  );
};

const InvoicesSection: React.FC<{ shop: Shop }> = ({ shop }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<InvFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [scanTarget, setScanTarget] = useState<QRVerifyTarget | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['shop-invoices', shop.id, user?.id],
    queryFn: () => filterInvoices({ shopId: shop.id, userId: user?.id }),
    enabled: !!user?.id,
  });

  const markPrinted = useMutation({
    mutationFn: markInvoicePrinted,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop-invoices'] }),
  });

  const unpaidInvoices = invoices.filter(inv => !inv.paid);
  const totalDebt = unpaidInvoices.reduce((s, inv) => s + Number(inv.totalPrice), 0);

  const filtered = invoices.filter(inv => {
    if (filter === 'unpaid') return !inv.paid;
    if (filter === 'unprinted') return !inv.printed;
    return true;
  });

  const toPrint = (inv: Invoice): PrintInvoiceData => ({
    id: inv.id, type: 'inv', date: inv.date,
    shopId: inv.shop?.id, shopTitle: inv.shop?.title ?? shop.title,
    userId: inv.user?.id ?? user?.id ?? 0, userFullname: inv.user?.fullname ?? user?.fullname ?? '',
    totalPrice: Number(inv.totalPrice), paid: inv.paid, notes: inv.notes,
    products: (inv.products ?? []).map(p => ({
      productName: p.productName, quantity: p.quantity, unitPrice: p.unitPrice,
      totalPrice: p.unitPrice * p.quantity,
    })),
  });

  return (
    <div style={{ padding: 12 }}>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {(['all', 'unpaid', 'unprinted'] as InvFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer',
            background: filter === f ? '#1677ff' : '#f0f4ff',
            color: filter === f ? '#fff' : '#6b7280',
            fontWeight: filter === f ? 600 : 400,
          }}>
            {f === 'all' ? t('common.all') : f === 'unpaid' ? t('common.unpaid') : t('invoices.not_printed')}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {unpaidInvoices.length > 1 && (
            <Button size="small" style={{ borderRadius: 20, borderColor: '#fa8c16', color: '#fa8c16' }} onClick={() => setBulkOpen(true)}>
              💰 {t('menu.bulk_collect_payment')}
            </Button>
          )}
          <Button type="primary" size="small" style={{ borderRadius: 20 }} onClick={() => setCreateOpen(true)}>
            + {t('invoices.create_invoice')}
          </Button>
        </div>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 20 }}>{t('common.loading')}</div>}
      {!isLoading && filtered.length === 0 && <Empty />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(inv => (
          <div key={inv.id} style={{ ...card, borderLeft: `3px solid ${inv.paid ? '#52c41a' : '#fa8c16'}` }}>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <Text strong style={{ fontSize: 14 }}>{t('invoices.invoice')} #{inv.id}</Text>
                  <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(inv.date).format('DD.MM.YYYY HH:mm')}</Text></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ color: '#1677ff', fontSize: 16 }}>{formatCurrency(inv.totalPrice)}</Text>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Tag color={inv.paid ? 'green' : 'orange'} style={{ fontSize: 10, margin: 0 }}>
                      {inv.paid ? t('common.paid') : t('common.unpaid')}
                    </Tag>
                    {inv.printed
                      ? <Tag color="green" style={{ fontSize: 10, margin: 0 }}>{t('invoices.printed')}</Tag>
                      : <Tag style={{ fontSize: 10, margin: 0 }}>{t('invoices.not_printed')}</Tag>}
                  </div>
                </div>
              </div>

              {/* Products */}
              <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 6, marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, marginBottom: 3, display: 'block' }}>{t('invoices.products')}:</Text>
                {(inv.products ?? []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '1px 0' }}>
                    <span>{p.productName} ×{p.quantity}</span>
                    <span style={{ color: '#6b7280' }}>{formatCurrency(p.unitPrice * p.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <Space wrap size={6}>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() => {
                    downloadInvoicePDF(toPrint(inv));
                    if (!inv.printed) markPrinted.mutate(inv.id);
                  }}
                >
                  {t('invoices.print')}
                </Button>
                {!inv.paid && (
                  <Button
                    size="small" type="primary" ghost
                    icon={<DollarOutlined />}
                    onClick={() => setPayInvoice(inv)}
                  >
                    {t('payments.record_payment')}
                  </Button>
                )}
                {!inv.printed && (
                  <Button
                    size="small"
                    icon={<ScanOutlined />}
                    onClick={() => setScanTarget({
                      type: 'inv', id: inv.id,
                      shopId: inv.shop?.id, userId: inv.user?.id, total: inv.totalPrice,
                    })}
                  >
                    {t('invoices.scan_qr')}
                  </Button>
                )}
              </Space>
            </div>
          </div>
        ))}
      </div>

      <CreateInvoiceModal
        open={createOpen} shop={shop}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['shop-invoices'] })}
      />
      <BulkPaymentModal
        open={bulkOpen} shop={shop}
        unpaidCount={unpaidInvoices.length}
        totalDebt={totalDebt}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['shop-invoices'] })}
      />
      <PaymentModal
        open={!!payInvoice} invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['shop-invoices'] })}
      />
      <QRScannerModal
        open={!!scanTarget} target={scanTarget}
        onVerified={() => scanTarget && markPrinted.mutate(scanTarget.id)}
        onClose={() => setScanTarget(null)}
      />
    </div>
  );
};

/* ══════════════════════════════════════
   PAYMENTS SECTION
══════════════════════════════════════ */
const PaymentsSection: React.FC<{ shop: Shop }> = ({ shop }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments-by-user', user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user?.id,
  });

  const shopPayments = (payments as any[]).filter(p => p.shopId === shop.id || p.invoice?.shop?.id === shop.id);

  return (
    <div style={{ padding: 12 }}>
      {isLoading && <div style={{ textAlign: 'center', padding: 20 }}>{t('common.loading')}</div>}
      {!isLoading && shopPayments.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shopPayments.map((p: any) => (
          <div key={p.id} style={{ ...card, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(p.date).format('DD.MM.YYYY')}</Text>
              <div>
                <Tag style={{ fontSize: 10 }}>{p.paymentMethod}</Tag>
                {p.description && <Text type="secondary" style={{ fontSize: 11 }}> {p.description}</Text>}
              </div>
              {p.invoiceId && <Text type="secondary" style={{ fontSize: 11 }}>#{p.invoiceId}</Text>}
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
   RETURNS SECTION
══════════════════════════════════════ */
const ReturnsSection: React.FC<{ shop: Shop }> = ({ shop }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selInvoice, setSelInvoice] = useState<Invoice | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [desc, setDesc] = useState('');

  const { data: allReturns = [] } = useQuery({
    queryKey: ['returns'],
    queryFn: getReturns,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['shop-invoices', shop.id, user?.id],
    queryFn: () => filterInvoices({ shopId: shop.id, userId: user?.id }),
    enabled: !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: (items: any[]) => Promise.all(items.map(createReturn)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      message.success(t('returns.return_created'));
      setWizardOpen(false); setStep(0); setSelInvoice(null); setReturnQtys({}); setDesc('');
    },
  });

  const handleSubmit = () => {
    if (!selInvoice || !user) return;
    const items = (selInvoice.products ?? [])
      .filter(p => (returnQtys[p.productId] ?? 0) > 0)
      .map(p => ({
        invoiceId: selInvoice.id,
        productId: p.productId,
        quantity: returnQtys[p.productId],
        description: desc,
        userId: user.id,
        shopId: shop.id,
      }));
    if (!items.length) { message.error(t('returns.add_qty')); return; }
    mutation.mutate(items);
  };

  const shopReturns = (allReturns as any[]).filter(r => r.shopId === shop.id || r.invoice?.shop?.id === shop.id);
  const unpaidInvoices = invoices.filter(i => !i.paid);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button type="primary" icon={<RollbackOutlined />} size="small" onClick={() => { setWizardOpen(true); setStep(0); }}>
          {t('mobile.new_return')}
        </Button>
      </div>

      {shopReturns.length === 0 && <Empty />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shopReturns.map((r: any) => (
          <div key={r.id} style={{ ...card, padding: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Text strong style={{ fontSize: 13 }}>{r.productName}</Text>
              <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(r.date).format('DD.MM.YYYY')}</Text></div>
              {r.description && <Text type="secondary" style={{ fontSize: 11 }}>{r.description}</Text>}
            </div>
            <Tag color="red">×{r.quantity}</Tag>
          </div>
        ))}
      </div>

      <Modal title={t('mobile.new_return')} open={wizardOpen} onCancel={() => setWizardOpen(false)} footer={null} destroyOnHidden>
        <Steps current={step} size="small" style={{ marginBottom: 16 }} items={[
          { title: t('mobile.select_invoice') },
          { title: t('common.products') },
        ]} />

        {step === 0 && (
          <>
            <Text style={{ display: 'block', marginBottom: 8 }}>{t('mobile.last5_unpaid')}</Text>
            {unpaidInvoices.length === 0 && <Empty description={t('mobile.no_unpaid_invoices')} />}
            {unpaidInvoices.slice(0, 5).map(inv => (
              <div key={inv.id} onClick={() => { setSelInvoice(inv); setReturnQtys({}); setStep(1); }} style={{
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

        {step === 1 && selInvoice && (
          <>
            <Button size="small" onClick={() => setStep(0)} style={{ marginBottom: 10 }}>{t('common.back')}</Button>
            {(selInvoice.products ?? []).map(p => (
              <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <Text style={{ fontSize: 13 }}>{p.productName}</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('common.qty')}: {p.quantity}</Text>
                </div>
                <InputNumber
                  min={0} max={p.quantity} size="small" style={{ width: 70 }}
                  value={returnQtys[p.productId] ?? 0}
                  onChange={v => setReturnQtys(q => ({ ...q, [p.productId]: v ?? 0 }))}
                />
              </div>
            ))}
            <Input.TextArea rows={2} placeholder={t('common.notes')} value={desc} onChange={e => setDesc(e.target.value)} style={{ marginBottom: 10 }} />
            <Button type="primary" block loading={mutation.isPending} onClick={handleSubmit}>
              {t('returns.submit_return')}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   SHOP DETAIL
══════════════════════════════════════ */
const ShopDetail: React.FC<{ shop: Shop; onBack: () => void }> = ({ shop, onBack }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ShopTab>('invoices');

  const openMaps = () => {
    if (!shop.gps) return;
    const [lat, lng] = shop.gps.split(',').map(s => s.trim());
    window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Shop header */}
      <div style={{ background: 'linear-gradient(135deg,#1677ff,#0958d9)', color: '#fff', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Button
            icon={<ArrowLeftOutlined />} size="small" onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{shop.title}</div>
            {shop.description && <div style={{ fontSize: 12, opacity: 0.85 }}>{shop.description}</div>}
          </div>
        </div>
        <Space size={8}>
          {shop.tel && (
            <Button size="small" icon={<PhoneOutlined />}
              onClick={() => window.location.href = `tel:${shop.tel}`}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 11 }}>
              {shop.tel}
            </Button>
          )}
          {shop.gps && (
            <Button size="small" icon={<EnvironmentOutlined />} onClick={openMaps}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 11 }}>
              {t('profile.open_maps')}
            </Button>
          )}
        </Space>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#f0f4ff', flexShrink: 0 }}>
        {(['invoices', 'payments', 'returns'] as ShopTab[]).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex: 1, border: 'none', background: 'transparent', padding: '10px 4px',
            borderBottom: `2px solid ${tab === tb ? '#1677ff' : 'transparent'}`,
            color: tab === tb ? '#1677ff' : '#6b7280', fontWeight: tab === tb ? 700 : 400, fontSize: 13, cursor: 'pointer',
          }}>
            {tb === 'invoices' ? t('menu.invoices') : tb === 'payments' ? t('menu.payments') : t('menu.returns')}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'invoices' && <InvoicesSection shop={shop} />}
        {tab === 'payments' && <PaymentsSection shop={shop} />}
        {tab === 'returns' && <ReturnsSection shop={shop} />}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   SHOP LIST
══════════════════════════════════════ */
const ShopList: React.FC<{ onSelect: (shop: Shop) => void }> = ({ onSelect }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops'],
    queryFn: getShops,
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ['shop-invoices-all', user?.id],
    queryFn: () => filterInvoices({ userId: user?.id }),
    enabled: !!user?.id,
  });

  const getShopDebt = (shopId: number) => {
    const unpaid = allInvoices.filter(inv => inv.shop?.id === shopId && !inv.paid);
    return { count: unpaid.length, total: unpaid.reduce((s, inv) => s + Number(inv.totalPrice), 0) };
  };

  const myShops = shops.filter(s =>
    (s as any).shopkeeper?.id === user?.id || (s as any).userId === user?.id
  );

  const recentIds = getRecentIds();
  const recentShops = recentIds.map(id => myShops.find(s => s.id === id)).filter(Boolean) as Shop[];
  const otherShops = myShops.filter(s => !recentIds.includes(s.id));

  const filtered = [...recentShops, ...otherShops].filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 12 }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder={t('shops.search')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />
      {isLoading && <div style={{ textAlign: 'center', padding: 20 }}>{t('common.loading')}</div>}
      {!isLoading && filtered.length === 0 && <Empty description={t('shops.no_shops')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(shop => (
          <div
            key={shop.id}
            onClick={() => { addRecentId(shop.id); onSelect(shop); }}
            style={{ ...card, cursor: 'pointer', padding: 0 }}
          >
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center' }}>
              {shop.image
                ? <img src={imgSrc(shop.image)!} alt={shop.title} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    <ShopOutlined style={{ color: '#4f46e5' }} />
                  </div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 14, display: 'block' }}>{shop.title}</Text>
                {shop.description && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shop.description}
                  </Text>
                )}
                {shop.tel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <PhoneOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{shop.tel}</Text>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {(() => { const debt = getShopDebt(shop.id); return debt.count > 0 ? (
                  <span style={{ background: '#fa8c16', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                    {debt.count} {t('common.unpaid').toLowerCase()}
                  </span>
                ) : null; })()}
                <span style={{ color: '#d0d7e8', fontSize: 18 }}>›</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   SHOPS TAB ROOT
══════════════════════════════════════ */
const ShopsTab: React.FC = () => {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  if (selectedShop) {
    return <ShopDetail shop={selectedShop} onBack={() => setSelectedShop(null)} />;
  }

  return <ShopList onSelect={setSelectedShop} />;
};

export default ShopsTab;
