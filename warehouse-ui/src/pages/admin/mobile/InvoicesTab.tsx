import React, { useState } from 'react';
import { Input, Tag, Spin, Modal, Divider, Button, InputNumber, Select } from 'antd';
import {
  SearchOutlined, CheckCircleOutlined, UserOutlined,
  PrinterOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filterInvoices, markInvoicePaid } from '../../../api/invoices';
import { getShops } from '../../../api/shops';
import { getUsers } from '../../../api/users';
import { createPayment } from '../../../api/payments';
import type { Invoice, PaymentMethod } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';
import { downloadInvoicePDF } from '../../../utils/mobilePrint';

type Filter = 'all' | 'paid' | 'unpaid';

/* ─── Print helper ─── */
const printInvoice = (inv: Invoice) => downloadInvoicePDF({
  id: inv.id,
  type: 'inv',
  date: inv.date,
  shopId: inv.shop?.id,
  shopTitle: inv.shop?.title,
  userId: inv.user?.id ?? 0,
  userFullname: inv.user?.fullname ?? '',
  totalPrice: Number(inv.totalPrice),
  paid: inv.paid,
  notes: inv.notes,
  products: (inv.products ?? []).map(p => ({
    productName: p.productName,
    quantity: p.quantity,
    unitPrice: p.unitPrice,
    totalPrice: p.totalPrice,
  })),
});

/* ─── Payment Modal ─── */
interface PaymentModalProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, invoice, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  const alreadyPaid = invoice ? invoice.payments.reduce((s, p) => s + Number(p.amount), 0) : 0;
  const remaining = invoice ? Math.max(0, Number(invoice.totalPrice) - alreadyPaid) : 0;

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      setAmount(null);
      setMethod('CASH');
      onSuccess();
      onClose();
    },
  });

  const methodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: t('payments.method_cash') },
    { value: 'CARD', label: t('payments.method_card') },
    { value: 'BANK_TRANSFER', label: t('payments.method_bank') },
    { value: 'OTHER', label: t('payments.method_other') },
  ];

  return (
    <Modal
      open={open}
      title={`${t('payments.record_payment')} — #${invoice?.id}`}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
        <div style={{ background: '#fff7e6', borderRadius: 10, padding: '10px 14px', borderLeft: '4px solid #fa8c16' }}>
          <div style={{ fontSize: 12, color: '#888' }}>{t('payments.no_payments')} / {t('common.total')}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fa8c16' }}>{formatCurrency(remaining)}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('common.amount')}:</div>
          <InputNumber
            style={{ width: '100%' }} size="large"
            min={0.01} max={remaining} value={amount}
            onChange={v => setAmount(v)}
            formatter={v => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
            placeholder="0" addonAfter="TJS"
          />
          <Button size="small" type="link" style={{ padding: 0, marginTop: 4 }} onClick={() => setAmount(remaining)}>
            {t('payments.total_collected')}: {formatCurrency(remaining)}
          </Button>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('payments.method')}:</div>
          <Select style={{ width: '100%' }} size="large" value={method} onChange={v => setMethod(v)} options={methodOptions} />
        </div>
        <Button
          type="primary" size="large" block icon={<DollarOutlined />}
          loading={mutation.isPending}
          disabled={!amount || amount <= 0 || !invoice}
          onClick={() => invoice && amount && mutation.mutate({
            invoiceId: invoice.id, shopId: invoice.shop.id, amount, paymentMethod: method,
          })}
        >
          {t('payments.record_payment')}
        </Button>
      </div>
    </Modal>
  );
};

/* ─── Main Tab ─── */
const InvoicesTab: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [shopFilter, setShopFilter] = useState<number | undefined>();
  const [userFilter, setUserFilter] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const [selected, setSelected] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', shopFilter, userFilter, dateFrom, dateTo],
    queryFn: () => filterInvoices({ shopId: shopFilter, userId: userFilter, from: dateFrom, to: dateTo }),
  });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const markPaidMutation = useMutation({
    mutationFn: markInvoicePaid,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setSelected(null); },
  });

  const filtered = invoices.filter((inv: Invoice) => {
    const matchSearch =
      inv.shop?.title?.toLowerCase().includes(search.toLowerCase()) ||
      inv.user?.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      String(inv.id).includes(search);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'paid' ? inv.paid :
      !inv.paid;
    return matchSearch && matchFilter;
  });

  const pills: { key: Filter; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'unpaid', label: t('common.unpaid') },
    { key: 'paid', label: t('common.paid') },
  ];

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 4px', flexShrink: 0 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder={`${t('common.shop')}, ${t('common.sales_rep')}, ID...`}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 12 }} allowClear
        />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px 4px', flexShrink: 0 }}>
        {pills.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            whiteSpace: 'nowrap', border: 'none', borderRadius: 16, padding: '5px 14px',
            fontSize: 13, fontWeight: filter === key ? 600 : 400, cursor: 'pointer',
            background: filter === key ? '#1677ff' : '#e8ecf4',
            color: filter === key ? '#fff' : '#6b7280',
            transition: 'all 0.2s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 12px', flexShrink: 0 }}>
        <Select placeholder={t('common.shop')} allowClear style={{ flex: 1 }}
          value={shopFilter} onChange={setShopFilter} size="small">
          {shops.map(s => <Select.Option key={s.id} value={s.id}>{s.title}</Select.Option>)}
        </Select>
        <Select placeholder={t('common.sales_rep')} allowClear style={{ flex: 1 }}
          value={userFilter} onChange={setUserFilter} size="small">
          {users.map(u => <Select.Option key={u.id} value={u.id}>{u.fullname}</Select.Option>)}
        </Select>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '4px 12px 6px', flexShrink: 0 }}>
        <input type="date" value={dateFrom ?? ''} onChange={e => setDateFrom(e.target.value || undefined)}
          style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 8px', fontSize: 12 }} />
        <input type="date" value={dateTo ?? ''} onChange={e => setDateTo(e.target.value || undefined)}
          style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 8px', fontSize: 12 }} />
      </div>

      <div style={{ padding: '2px 12px 6px', fontSize: 12, color: '#9ca3af' }}>
        {filtered.length} {t('menu.invoices').toLowerCase()}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(inv => (
            <div
              key={inv.id}
              onClick={() => setSelected(inv)}
              style={{
                background: '#fff', borderRadius: 14, padding: '12px 14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                borderLeft: `3px solid ${inv.paid ? '#52c41a' : '#fa8c16'}`,
                cursor: 'pointer', transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                    #{inv.id} · {inv.shop?.title}
                  </span>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    <UserOutlined style={{ marginRight: 4 }} />{inv.user?.fullname}
                  </div>
                </div>
                <Tag
                  color={inv.paid ? 'green' : inv.free ? 'purple' : 'orange'}
                  style={{ margin: 0, fontSize: 11 }}
                >
                  {inv.paid ? t('common.paid') : inv.free ? t('common.free') : t('common.unpaid')}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: inv.paid ? '#52c41a' : '#1677ff' }}>
                  {formatCurrency(inv.totalPrice)}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(inv.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={`${t('invoices.invoice_details')} #${selected?.id}`}
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        destroyOnHidden
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{t('common.shop')}</div>
                <div style={{ fontWeight: 600 }}>{selected.shop?.title}</div>
              </div>
              <Tag color={selected.paid ? 'green' : 'orange'}>
                {selected.paid ? t('common.paid') : t('common.unpaid')}
              </Tag>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{t('common.sales_rep')}</div>
              <div style={{ fontWeight: 500 }}>{selected.user?.fullname}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{t('common.date')}</div>
              <div>{formatDate(selected.date)}</div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('common.products')}:</div>
            {selected.products?.map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
                background: '#f9fafb', borderRadius: 8,
              }}>
                <span style={{ fontSize: 13 }}>{p.productName} × {p.quantity}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1677ff' }}>{formatCurrency(p.totalPrice)}</span>
              </div>
            ))}

            {/* Payments summary */}
            {selected.payments?.length > 0 && (
              <>
                <Divider style={{ margin: '6px 0' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('menu.payments')}:</div>
                {selected.payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                    <span>{formatDate(p.paidAt)}</span>
                    <span style={{ fontWeight: 600, color: '#52c41a' }}>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </>
            )}

            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{t('common.total')}:</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>{formatCurrency(selected.totalPrice)}</span>
            </div>
            {selected.notes && (
              <div style={{ background: '#fffbf0', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#6b7280' }}>
                {selected.notes}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <Button
                icon={<PrinterOutlined />}
                onClick={() => printInvoice(selected)}
                style={{ flex: 1 }}
              >
                {t('invoices.print')}
              </Button>
              {!selected.paid && !selected.free && (
                <>
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={() => { setSelected(null); setPaymentInvoice(selected); }}
                    style={{ flex: 1 }}
                  >
                    {t('payments.record_payment')}
                  </Button>
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => markPaidMutation.mutate(selected.id)}
                    loading={markPaidMutation.isPending}
                    block
                  >
                    {t('invoices.mark_paid')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        open={!!paymentInvoice}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
      />
    </div>
  );
};

export default InvoicesTab;
