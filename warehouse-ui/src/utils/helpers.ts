import dayjs from 'dayjs';

export const formatDate = (date?: string) =>
  date ? dayjs(date).format('DD/MM/YYYY') : '-';

export const formatDateTime = (date?: string) =>
  date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-';

export const formatCurrency = (amount?: number) =>
  amount !== undefined
    ? amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' сом'
    : '-';

export const paymentMethodOptions = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Card', value: 'CARD' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Other', value: 'OTHER' },
];
