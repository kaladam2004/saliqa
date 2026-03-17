import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Divider, Empty, Input, InputNumber, message,
  Modal, Select, Space, Spin, Steps, Tag, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, DollarOutlined, EnvironmentOutlined,
  MinusOutlined, PhoneOutlined, PlusOutlined, PrinterOutlined,
  RollbackOutlined, ScanOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { filterInvoices, createInvoice, markInvoicePrinted } from '../../../api/invoices';
import { getPaymentsByUser, createPayment } from '../../../api/payments';
import { getReturns, createReturn } from '../../../api/returns';
import { getRepProducts } from '../../../api/userInvoices';
import { getShops } from '../../../api/shops';
import type { Invoice, Product, ReturnProductItem, Shop, PaymentMethod } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { buildQrPayload, type PrintInvoiceData } from '../../../components/common/InvoicePrintModal';
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

/* ─── Print helper (works on mobile too) ─── */
const printInvoice = (data: PrintInvoiceData) => {
  const qr = buildQrPayload(data);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice #${data.id}</title>
<style>
  body{font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto}
  h2{margin:0 0 4px}
  .meta{color:#666;font-size:13px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #ddd;padding:7px 10px;font-size:13px;text-align:left}
  th{background:#f5f5f5;font-weight:600}
  .total{text-align:right;font-weight:700;font-size:15px;margin-top:8px}
  .sigs{display:flex;justify-content:space-between;margin-top:48px}
  .sig{border-top:1px solid #000;width:180px;padding-top:4px;font-size:12px;text-align:center}
  .qr{float:right}
  .print-btn{display:block;margin:0 auto 16px;padding:12px 32px;background:#1677ff;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer}
  @media print{.print-btn{display:none}body{padding:0}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 Print</button>
<div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qr)}" width="100" height="100"/></div>
<h2>Invoice #${data.id}</h2>
<div class="meta">${dayjs(data.date).format('DD.MM.YYYY HH:mm')}</div>
<div>${data.shopTitle ? `<b>Shop:</b> ${data.shopTitle}` : `<b>Warehouse:</b> ${data.warehouseTitle ?? ''}`}</div>
<div><b>Rep:</b> ${data.userFullname}</div>
${data.notes ? `<div><b>Notes:</b> ${data.notes}</div>` : ''}
<table>
  <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
  ${data.products.map(p => `<tr><td>${p.productName}</td><td>${p.quantity}</td><td>${formatCurrency(p.unitPrice)}</td><td>${formatCurrency(p.totalPrice ?? p.unitPrice * p.quantity)}</td></tr>`).join('')}
</table>
<div class="total">Total: ${formatCurrency(data.totalPrice)}</div>
<div class="sigs"><div class="sig">Sales Rep</div><div class="sig">Signature</div></div>
<script>window.onload=function(){try{window.print();}catch(e){}}</script>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/* ─── Payment Modal ─── */
interface PaymentModalProps {
  open: boolean;
  invoice: Invoice | null;
  shop: Shop;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, invoice, shop, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  const remaining = invoice
    ? Math.max(0, Number(invoice.totalPrice) - invoice.payments.reduce((s, p) => s + Number(p.amount), 0))
    : 0;

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      message.success(t('payments.payment_recorded'));
      setAmount(null);
      setMethod('CASH');
      onSuccess();
      onClose();
    },
    onError: () => message.error(t('common.error')),
  });

  const handleSubmit = () => {
    if (!invoice || !amount || amount <= 0) return;
    mutation.mutate({ invoiceId: invoice.id, shopId: shop.id, amount, paymentMethod: method });
  };

  const methodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: t('payments.method_cash') },
    { value: 'CARD', label: t('payments.method_card') },
    { value: 'BANK_TRANSFER', label: t('payments.method_bank') },
    { value: 'OTHER', label: t('payments.method_other') },
  ];

  return (
    <Modal
      open={open}
      title={`${t('payments.record_payment')} — ${t('mobile.invoice_of')} #${invoice?.id}`}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
        <div style={{ background: '#fff7e6', borderRadius: 10, padding: '10px 14px', borderLeft: '4px solid #fa8c16' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('payments.no_payments')} / {t('common.total')}</Text>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fa8c16' }}>{formatCurrency(remaining)}</div>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('common.amount')}:</Text>
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            min={0.01}
            max={remaining}
            value={amount}
            onChange={v => setAmount(v)}
            formatter={v => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
            placeholder="0"
            addonAfter="TJS"
          />
          <Button
            size="small"
            type="link"
            style={{ padding: 0, marginTop: 4 }}
            onClick={() => setAmount(remaining)}
          >
            {t('payments.total_collected')}: {formatCurrency(remaining)}
          </Button>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('payments.method')}:</Text>
          <Select
            style={{ width: '100%' }}
            size="large"
            value={method}
            onChange={v => setMethod(v)}
            options={methodOptions}
          />
        </div>

        <Button
          type="primary"
          size="large"
          block
          icon={<DollarOutlined />}
          loading={mutation.isPending}
          disabled={!amount || amount <= 0}
          onClick={handleSubmit}
          style={{ marginTop: 4 }}
        >
          {t('payments.record_payment')}
        </Button>
      </div>
    </Modal>
  );
};

/* ─── Shop detail sub-tabs ─── */
type ShopSubTab = 'invoices' | 'payments' | 'returns';

/* ══════════════════════════════════════
   INVOICE WIZARD MODAL
══════════════════════════════════════ */
interface InvoiceWizardProps {
  open: boolean;
  shop: Shop;
  userId: number;
  onClose: () => void;
}

const InvoiceWizardModal: React.FC<InvoiceWizardProps> = ({ open, shop, userId, onClose }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data: productPage, isLoading } = useQuery({
    queryKey: ['rep-products-wizard', userId],
    queryFn: () => getRepProducts(userId, '', 0, 100),
    enabled: open && !!userId,
  });

  const allProducts: Product[] = productPage?.content ?? [];
  const filtered = useMemo(() =>
    debouncedSearch
      ? allProducts.filter(p => p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : allProducts,
    [allProducts, debouncedSearch],
  );

  const totalAmount = useMemo(() =>
    Object.entries(qtys).reduce((sum, [id, qty]) => {
      const p = allProducts.find(x => x.id === Number(id));
      return p ? sum + (p.price as unknown as number) * qty : sum;
    }, 0),
    [qtys, allProducts],
  );

  const hasItems = Object.values(qtys).some(q => q > 0);

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-invoices', userId] });
      message.success(t('invoices.invoice_created'));
      setSearch('');
      setQtys({});
      onClose();
    },
    onError: () => message.error(t('common.error')),
  });

  const handleSubmit = () => {
    const products = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const p = allProducts.find(x => x.id === Number(id))!;
        return { productId: Number(id), quantity: qty, unitPrice: p.price as unknown as number };
      });
    if (!products.length) { message.warning(t('mobile.no_items_selected')); return; }
    createMutation.mutate({ shopId: shop.id, userId, free: false, products });
  };

  const handleClose = () => {
    setSearch('');
    setDebouncedSearch('');
    setQtys({});
    onClose();
  };

  return (
    <Modal
      open={open}
      title={t('mobile.create_invoice_for', { shop: shop.title })}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
        {/* Search */}
        <div style={{ padding: '12px 16px 8px' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('mobile.search_products')}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            allowClear
            onClear={() => handleSearchChange('')}
          />
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          )}
          {!isLoading && filtered.length === 0 && (
            <Empty description={t('mobile.no_products')} style={{ padding: '24px 0' }} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {filtered.map(p => {
              const qty = qtys[p.id] ?? 0;
              const selected = qty > 0;
              return (
                <div
                  key={p.id}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: `2px solid ${selected ? '#1677ff' : '#e8e8e8'}`,
                    boxShadow: selected
                      ? '0 0 0 2px rgba(22,119,255,0.15), 0 4px 12px rgba(22,119,255,0.1)'
                      : '0 2px 6px rgba(0,0,0,0.04)',
                    padding: 10,
                    position: 'relative',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Selection badge */}
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      background: '#1677ff', color: '#fff',
                      borderRadius: 10, fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', lineHeight: '16px',
                    }}>
                      {qty}
                    </div>
                  )}

                  {/* Image */}
                  <div style={{ textAlign: 'center', marginBottom: 6 }}>
                    {imgSrc(p.image)
                      ? <img
                          src={imgSrc(p.image)!}
                          alt={p.name}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                        />
                      : <div style={{
                          width: 64, height: 64, background: '#f5f7fa', borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28, margin: '0 auto',
                        }}>📦</div>
                    }
                  </div>

                  {/* Name */}
                  <Text
                    strong
                    style={{
                      fontSize: 12, display: 'block', textAlign: 'center',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </Text>

                  {/* Price */}
                  <Text style={{ color: '#1677ff', fontSize: 12, fontWeight: 600, display: 'block', textAlign: 'center', marginTop: 2 }}>
                    {formatCurrency(p.price as unknown as number)}
                  </Text>

                  {/* Stock */}
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginBottom: 6 }}>
                    {t('mobile.stock', { count: p.quantity })}
                  </Text>

                  {/* Counter */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <button
                      onClick={() => setQtys(q => {
                        const next = (q[p.id] ?? 0) - 1;
                        if (next <= 0) { const n = { ...q }; delete n[p.id]; return n; }
                        return { ...q, [p.id]: next };
                      })}
                      style={{
                        width: 26, height: 26, borderRadius: 6, border: '1px solid #d9d9d9',
                        background: '#f5f5f5', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}
                    >
                      <MinusOutlined style={{ fontSize: 11 }} />
                    </button>
                    <Text strong style={{ minWidth: 22, textAlign: 'center', fontSize: 13 }}>
                      {qty}
                    </Text>
                    <button
                      onClick={() => setQtys(q => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))}
                      style={{
                        width: 26, height: 26, borderRadius: 6, border: '1px solid #1677ff',
                        background: '#1677ff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}
                    >
                      <PlusOutlined style={{ fontSize: 11, color: '#fff' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{t('common.total')}:</Text>
            <Text strong style={{ fontSize: 15, color: '#1677ff', marginLeft: 6 }}>
              {formatCurrency(totalAmount)}
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            disabled={!hasItems}
            loading={createMutation.isPending}
            onClick={handleSubmit}
            style={{ minWidth: 100 }}
          >
            {t('mobile.confirm_invoice')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════
   RETURN WIZARD MODAL (3-step)
══════════════════════════════════════ */
interface ReturnWizardProps {
  open: boolean;
  shop: Shop;
  userId: number;
  onClose: () => void;
}

const ReturnWizardModal: React.FC<ReturnWizardProps> = ({ open, shop, userId, onClose }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [desc, setDesc] = useState('');

  const { data: shopInvoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['invoices-for-return', shop.id, userId],
    queryFn: () => filterInvoices({ shopId: shop.id, userId }),
    enabled: open && !!shop.id && !!userId,
  });

  const last5Unpaid = useMemo(
    () => shopInvoices.filter(i => !i.paid).slice(-5).reverse(),
    [shopInvoices],
  );

  const createMutation = useMutation({
    mutationFn: createReturn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      message.success(t('returns.return_created'));
      handleClose();
    },
    onError: () => message.error(t('common.error')),
  });

  const handleClose = () => {
    setStep(0);
    setSelectedInvoice(null);
    setReturnQtys({});
    setDesc('');
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedInvoice) return;
    const products: ReturnProductItem[] = selectedInvoice.products
      .filter(p => (returnQtys[p.productId] ?? 0) > 0)
      .map(p => ({ productId: p.productId, quantity: returnQtys[p.productId] }));
    if (!products.length) { message.warning(t('mobile.no_items_selected')); return; }
    createMutation.mutate({
      userId,
      shopId: shop.id,
      invoiceId: selectedInvoice.id,
      description: desc,
      products,
    });
  };

  return (
    <Modal
      open={open}
      title={t('mobile.new_return')}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 20 }}
        items={[
          { title: t('mobile.select_invoice') },
          { title: t('common.product') },
          { title: t('mobile.confirm_invoice') },
        ]}
      />

      {/* Step 0: Select invoice */}
      {step === 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
            {t('mobile.last5_unpaid')} — {shop.title}:
          </Text>
          {invLoading && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}
          {!invLoading && last5Unpaid.length === 0 && (
            <Empty description={t('mobile.no_unpaid_invoices')} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {last5Unpaid.map(inv => (
              <div
                key={inv.id}
                onClick={() => { setSelectedInvoice(inv); setReturnQtys({}); setStep(1); }}
                style={{
                  padding: 12, background: '#f0f4ff', borderRadius: 10,
                  cursor: 'pointer', border: '1px solid #d6e8ff',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 13 }}>{t('mobile.invoice_of')} #{inv.id}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(inv.date).format('DD.MM.YY')}
                  </Text>
                </div>
                <Text style={{ color: '#1677ff', fontSize: 13, fontWeight: 600 }}>
                  {formatCurrency(inv.totalPrice)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Select product quantities */}
      {step === 1 && selectedInvoice && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>
              {t('mobile.back_to_list')}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('mobile.invoice_of')} #{selectedInvoice.id}
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedInvoice.products.map(p => (
              <div
                key={p.productId}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '8px 0',
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13 }}>{p.productName}</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {t('common.quantity')}: {p.quantity}
                  </Text>
                </div>
                <InputNumber
                  min={0}
                  max={p.quantity}
                  size="small"
                  style={{ width: 72 }}
                  value={returnQtys[p.productId] ?? 0}
                  onChange={v => setReturnQtys(q => ({ ...q, [p.productId]: v ?? 0 }))}
                />
              </div>
            ))}
          </div>
          <Button
            type="primary"
            block
            style={{ marginTop: 16 }}
            onClick={() => setStep(2)}
          >
            {t('common.next')}
          </Button>
        </div>
      )}

      {/* Step 2: Notes + submit */}
      {step === 2 && selectedInvoice && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => setStep(1)}>
              {t('mobile.back_to_list')}
            </Button>
          </div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('common.products')}:</Text>
          {selectedInvoice.products
            .filter(p => (returnQtys[p.productId] ?? 0) > 0)
            .map(p => (
              <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                <span>{p.productName}</span>
                <span>×{returnQtys[p.productId]}</span>
              </div>
            ))}
          <Divider style={{ margin: '12px 0' }} />
          <Text strong style={{ display: 'block', marginBottom: 6 }}>{t('common.description')}:</Text>
          <Input.TextArea
            rows={3}
            placeholder={t('common.description')}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button
            type="primary"
            block
            size="large"
            loading={createMutation.isPending}
            onClick={handleSubmit}
          >
            {t('mobile.confirm_invoice')}
          </Button>
        </div>
      )}
    </Modal>
  );
};

/* ══════════════════════════════════════
   SHOP DETAIL — INVOICES SUB-TAB
══════════════════════════════════════ */
interface ShopInvoicesProps {
  shop: Shop;
  userId: number;
}

const ShopInvoicesPanel: React.FC<ShopInvoicesProps> = ({ shop, userId }) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'unprinted'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [scanTarget, setScanTarget] = useState<QRVerifyTarget | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-invoices', userId, shop.id],
    queryFn: () => filterInvoices({ userId, shopId: shop.id }),
    enabled: !!userId && !!shop.id,
  });

  const markPrinted = useMutation({
    mutationFn: markInvoicePrinted,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-invoices', userId, shop.id] }),
  });

  const filtered = invoices.filter(i =>
    statusFilter === 'unpaid' ? !i.paid
      : statusFilter === 'unprinted' ? !i.printed
        : true,
  );

  const toPrint = (inv: Invoice): PrintInvoiceData => ({
    id: inv.id, type: 'inv', date: inv.date,
    shopId: inv.shop.id, shopTitle: inv.shop.title,
    userId: inv.user.id, userFullname: inv.user.fullname,
    totalPrice: inv.totalPrice, notes: inv.notes,
    products: inv.products.map(p => ({
      productName: p.productName, quantity: p.quantity,
      unitPrice: p.unitPrice, totalPrice: p.totalPrice,
    })),
  });

  const filterPills: { key: 'all' | 'unpaid' | 'unprinted'; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'unpaid', label: t('common.unpaid') },
    { key: 'unprinted', label: t('invoices.not_printed') },
  ];

  return (
    <div style={{ padding: '4px 12px 80px' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0', scrollbarWidth: 'none', flexShrink: 0 }}>
        {filterPills.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            style={{
              whiteSpace: 'nowrap', border: 'none', borderRadius: 20, padding: '5px 14px',
              fontSize: 12, fontWeight: statusFilter === key ? 600 : 400, cursor: 'pointer',
              background: statusFilter === key ? '#1677ff' : '#f0f4ff',
              color: statusFilter === key ? '#fff' : '#6b7280',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
      {!isLoading && filtered.length === 0 && (
        <Empty description={t('invoices.no_invoices')} style={{ padding: '32px 0' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {filtered.map(inv => {
          const isOpen = expandedId === inv.id;
          return (
            <div
              key={inv.id}
              style={{ ...card, borderLeft: `4px solid ${inv.paid ? '#52c41a' : '#fa8c16'}` }}
            >
              <div
                onClick={() => setExpandedId(isOpen ? null : inv.id)}
                style={{ padding: '10px 12px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{t('mobile.invoice_of')} #{inv.id}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {dayjs(inv.date).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text strong style={{ color: '#1677ff', fontSize: 14 }}>
                      {inv.free ? <Tag color="blue">{t('common.free')}</Tag> : formatCurrency(inv.totalPrice)}
                    </Text>
                    <div style={{ marginTop: 3 }}>
                      <Space size={3}>
                        <Tag
                          color={inv.paid ? 'green' : 'orange'}
                          style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}
                        >
                          {inv.paid ? t('common.paid') : t('common.unpaid')}
                        </Tag>
                        {inv.printed
                          ? <Tag color="green" style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>{t('invoices.printed')}</Tag>
                          : <Tag style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>{t('invoices.not_printed')}</Tag>
                        }
                      </Space>
                    </div>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid #f5f5f5', padding: '8px 12px' }}>
                  {/* Products */}
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{t('common.products')}:</Text>
                  {inv.products.map(p => (
                    <div
                      key={p.id}
                      style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}
                    >
                      <span>{p.productName} ×{p.quantity}</span>
                      <span>{formatCurrency(p.totalPrice)}</span>
                    </div>
                  ))}

                  {/* Payments */}
                  {inv.payments.length > 0 && (
                    <>
                      <Divider style={{ margin: '6px 0' }} />
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{t('menu.payments')}:</Text>
                      {inv.payments.map(p => (
                        <div
                          key={p.id}
                          style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}
                        >
                          <span>{dayjs(p.paidAt).format('DD.MM.YY')}</span>
                          <span>{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Actions */}
                  <Space style={{ marginTop: 10 }} wrap>
                    <Button
                      size="small"
                      icon={<PrinterOutlined />}
                      onClick={() => {
                        printInvoice(toPrint(inv));
                        if (!inv.printed) markPrinted.mutate(inv.id);
                      }}
                    >
                      {t('invoices.print')}
                    </Button>
                    {!inv.paid && (
                      <Button
                        size="small"
                        icon={<DollarOutlined />}
                        type="primary"
                        onClick={() => setSelectedInvoiceForPayment(inv)}
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
                          shopId: inv.shop.id, userId: inv.user.id,
                          total: inv.totalPrice,
                        })}
                      >
                        {t('invoices.scan_qr')}
                      </Button>
                    )}
                  </Space>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PaymentModal
        open={!!selectedInvoiceForPayment}
        invoice={selectedInvoiceForPayment}
        shop={shop}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['my-invoices', userId, shop.id] });
          qc.invalidateQueries({ queryKey: ['my-invoices', userId] });
          setSelectedInvoiceForPayment(null);
        }}
      />
      <QRScannerModal
        open={!!scanTarget}
        target={scanTarget}
        onVerified={() => scanTarget && markPrinted.mutate(scanTarget.id)}
        onClose={() => setScanTarget(null)}
      />
    </div>
  );
};

/* ══════════════════════════════════════
   SHOP DETAIL — PAYMENTS SUB-TAB
══════════════════════════════════════ */
interface ShopPaymentsProps {
  shop: Shop;
  userId: number;
}

const ShopPaymentsPanel: React.FC<ShopPaymentsProps> = ({ shop, userId }) => {
  const { t } = useTranslation();
  const { data: allPayments = [], isLoading } = useQuery({
    queryKey: ['payments-by-user', userId],
    queryFn: () => getPaymentsByUser(userId),
    enabled: !!userId,
  });

  const payments = allPayments.filter(p => p.shopId === shop.id);

  const methodLabel: Record<string, string> = {
    CASH: t('payments.method_cash'), CARD: t('payments.method_card'),
    BANK_TRANSFER: t('payments.method_bank'), OTHER: t('payments.method_other'),
  };
  const methodColor: Record<string, string> = {
    CASH: 'green', CARD: 'blue', BANK_TRANSFER: 'purple', OTHER: 'default',
  };

  return (
    <div style={{ padding: '8px 12px 80px' }}>
      {isLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
      {!isLoading && payments.length === 0 && (
        <Empty description={t('payments.no_payments')} style={{ padding: '32px 0' }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {payments.map(p => (
          <div
            key={p.id}
            style={{
              ...card, padding: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <Text strong style={{ fontSize: 13 }}>
                {formatCurrency(p.amount)}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                {formatDate(p.paidAt)}
              </Text>
              <Tag
                color={methodColor[p.paymentMethod] ?? 'default'}
                style={{ marginTop: 4, fontSize: 11 }}
              >
                {methodLabel[p.paymentMethod] ?? p.paymentMethod}
              </Tag>
            </div>
            <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
              +{formatCurrency(p.amount)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   SHOP DETAIL — RETURNS SUB-TAB
══════════════════════════════════════ */
interface ShopReturnsProps {
  shop: Shop;
  userId: number;
}

const ShopReturnsPanel: React.FC<ShopReturnsProps> = ({ shop, userId }) => {
  const { t } = useTranslation();
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: allReturns = [], isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: getReturns,
  });

  const returns = allReturns.filter(
    r => r.user.id === userId && r.shop.id === shop.id,
  );

  return (
    <div style={{ padding: '8px 12px 80px' }}>
      <div style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          icon={<RollbackOutlined />}
          onClick={() => setWizardOpen(true)}
          block
        >
          {t('mobile.new_return')}
        </Button>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
      {!isLoading && returns.length === 0 && (
        <Empty description={t('returns.no_returns')} style={{ padding: '32px 0' }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {returns.map(r => (
          <div key={r.id} style={{ ...card, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13 }}>{t('menu.returns')} #{r.id}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(r.date).format('DD.MM.YYYY')}
              </Text>
            </div>
            {r.products.map(p => (
              <Text
                key={p.productId}
                type="secondary"
                style={{ fontSize: 12, display: 'block' }}
              >
                {p.productName} ×{p.quantity}
              </Text>
            ))}
            {r.description && (
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block', fontStyle: 'italic' }}>
                {r.description}
              </Text>
            )}
          </div>
        ))}
      </div>

      <ReturnWizardModal
        open={wizardOpen}
        shop={shop}
        userId={userId}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  );
};

/* ══════════════════════════════════════
   SHOP DETAIL VIEW
══════════════════════════════════════ */
interface ShopDetailProps {
  shop: Shop;
  userId: number;
  onBack: () => void;
}

const ShopDetailView: React.FC<ShopDetailProps> = ({ shop, userId, onBack }) => {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<ShopSubTab>('invoices');
  const [invoiceWizardOpen, setInvoiceWizardOpen] = useState(false);

  const subTabs: { key: ShopSubTab; label: string }[] = [
    { key: 'invoices', label: t('menu.invoices') },
    { key: 'payments', label: t('menu.payments') },
    { key: 'returns', label: t('menu.returns') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f4ff' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '10px 12px 0', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* Back + shop identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button
            onClick={onBack}
            style={{
              border: 'none', background: '#f0f4ff', borderRadius: 10,
              width: 36, height: 36, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <ArrowLeftOutlined style={{ color: '#1677ff' }} />
          </button>

          {/* Shop avatar */}
          {imgSrc(shop.image)
            ? <img
                src={imgSrc(shop.image)!}
                alt={shop.title}
                style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
              />
            : <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #e8f4ff 0%, #bfdbfe 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>🏪</div>
          }

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shop.title}
              </Text>
              {shop.test && <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>TEST</Tag>}
            </div>
            {shop.shopkeeper && (
              <Text type="secondary" style={{ fontSize: 12 }}>{shop.shopkeeper.fullname}</Text>
            )}
          </div>
        </div>

        {/* Contact info row */}
        {(shop.tel || shop.gps) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {shop.tel && (
              <a href={`tel:${shop.tel}`} style={{ textDecoration: 'none' }}>
                <Tag icon={<PhoneOutlined />} color="blue" style={{ cursor: 'pointer', fontSize: 12 }}>
                  {shop.tel}
                </Tag>
              </a>
            )}
            {shop.gps && (
              <a
                href={`https://maps.google.com/?q=${shop.gps}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Tag icon={<EnvironmentOutlined />} color="green" style={{ cursor: 'pointer', fontSize: 12 }}>
                  GPS
                </Tag>
              </a>
            )}
          </div>
        )}

        {/* Sub-tab pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {subTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              style={{
                whiteSpace: 'nowrap', border: 'none',
                borderBottom: subTab === key ? '2px solid #1677ff' : '2px solid transparent',
                padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                background: 'transparent',
                color: subTab === key ? '#1677ff' : '#6b7280',
                fontWeight: subTab === key ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {subTab === 'invoices' && <ShopInvoicesPanel shop={shop} userId={userId} />}
        {subTab === 'payments' && <ShopPaymentsPanel shop={shop} userId={userId} />}
        {subTab === 'returns' && <ShopReturnsPanel shop={shop} userId={userId} />}
      </div>

      {/* FAB */}
      <button
        onClick={() => setInvoiceWizardOpen(true)}
        style={{
          position: 'fixed', bottom: 76, right: 16,
          background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
          color: '#fff', border: 'none', borderRadius: 28,
          padding: '13px 20px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
          display: 'flex', alignItems: 'center', gap: 6,
          zIndex: 100,
        }}
      >
        <PlusOutlined /> {t('invoices.create_invoice')}
      </button>

      <InvoiceWizardModal
        open={invoiceWizardOpen}
        shop={shop}
        userId={userId}
        onClose={() => setInvoiceWizardOpen(false)}
      />
    </div>
  );
};

/* ══════════════════════════════════════
   SHOP ROW
══════════════════════════════════════ */
interface ShopRowProps {
  shop: Shop;
  debtCount: number;
  onSelect: (shop: Shop) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

const ShopRow: React.FC<ShopRowProps> = ({ shop, debtCount, onSelect, t }) => (
  <div
    onClick={() => onSelect(shop)}
    style={{
      ...card,
      padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer',
      transition: 'box-shadow 0.15s',
    }}
  >
    {/* Avatar */}
    {imgSrc(shop.image)
      ? <img
          src={imgSrc(shop.image)!}
          alt={shop.title}
          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
        />
      : <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #e8f4ff 0%, #bfdbfe 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>🏪</div>
    }

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Text strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shop.title}
        </Text>
        {shop.test && <Tag color="orange" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>TEST</Tag>}
      </div>
      {shop.shopkeeper && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {shop.shopkeeper.fullname}
        </Text>
      )}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
      {debtCount > 0 && (
        <Tag
          color="red"
          style={{ fontSize: 10, margin: 0, lineHeight: '16px', fontWeight: 600 }}
        >
          {t('mobile.debt_invoices', { count: debtCount })}
        </Tag>
      )}
      <span style={{ color: '#c0c0c0', fontSize: 16 }}>›</span>
    </div>
  </div>
);

/* ══════════════════════════════════════
   SHOP LIST VIEW
══════════════════════════════════════ */
interface ShopListProps {
  userId: number;
  onSelectShop: (shop: Shop) => void;
}

const ShopListView: React.FC<ShopListProps> = ({ userId, onSelectShop }) => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentIds, setRecentIds] = useState<number[]>(() => getRecentIds());

  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  useEffect(() => {
    setRecentIds(getRecentIds());
  }, []);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops'],
    queryFn: getShops,
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ['my-invoices', userId],
    queryFn: () => filterInvoices({ userId }),
    enabled: !!userId,
  });

  const unpaidByShop = useMemo(() => {
    const map = new Map<number, number>();
    for (const inv of allInvoices) {
      if (!inv.paid) {
        map.set(inv.shop.id, (map.get(inv.shop.id) ?? 0) + 1);
      }
    }
    return map;
  }, [allInvoices]);

  const myShops = useMemo(
    () => shops.filter(s => s.shopkeeper?.id === userId),
    [shops, userId],
  );

  const filteredShops = useMemo(() => {
    if (!debouncedSearch) return myShops;
    const q = debouncedSearch.toLowerCase();
    return myShops.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.shopkeeper?.fullname ?? '').toLowerCase().includes(q),
    );
  }, [myShops, debouncedSearch]);

  const recentShops = useMemo(
    () => recentIds.map(id => myShops.find(s => s.id === id)).filter(Boolean) as Shop[],
    [recentIds, myShops],
  );

  const handleSelect = (shop: Shop) => {
    addRecentId(shop.id);
    setRecentIds(getRecentIds());
    onSelectShop(shop);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f4ff' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 12px 6px', background: '#f0f4ff', flexShrink: 0 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder={t('mobile.search_shops')}
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          allowClear
          onClear={() => handleSearchChange('')}
          style={{ borderRadius: 12 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 16px' }}>
        {/* Recent shops */}
        {recentShops.length > 0 && !debouncedSearch && (
          <div style={{ marginBottom: 14 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              {t('mobile.recent_shops')}
            </Text>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
              {recentShops.map(shop => (
                <button
                  key={shop.id}
                  onClick={() => handleSelect(shop)}
                  style={{
                    flexShrink: 0, border: 'none', borderRadius: 20,
                    background: '#e8f4ff', cursor: 'pointer',
                    padding: '7px 14px', fontSize: 12, fontWeight: 500,
                    color: '#1677ff', whiteSpace: 'nowrap',
                    boxShadow: '0 1px 4px rgba(22,119,255,0.1)',
                    transition: 'background 0.15s',
                  }}
                >
                  {shop.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shop list */}
        {isLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
        {!isLoading && filteredShops.length === 0 && (
          <Empty description={t('mobile.shops_not_found')} style={{ padding: '40px 0' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredShops.map(shop => (
            <ShopRow
              key={shop.id}
              shop={shop}
              debtCount={unpaidByShop.get(shop.id) ?? 0}
              onSelect={handleSelect}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   SHOPS TAB ROOT
══════════════════════════════════════ */
const ShopsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  if (!user) return null;

  if (selectedShop) {
    return (
      <ShopDetailView
        shop={selectedShop}
        userId={user.id}
        onBack={() => setSelectedShop(null)}
      />
    );
  }

  return (
    <ShopListView
      userId={user.id}
      onSelectShop={setSelectedShop}
    />
  );
};

export default ShopsTab;
