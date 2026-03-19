import axiosInstance from './axiosInstance';
import type { Payment, PaymentRequest, PaymentFilter, BulkPaymentRequest, BulkPaymentResponse } from '../types';

export const getPayments = async (): Promise<Payment[]> => (await axiosInstance.get('/payments')).data;
export const createPayment = async (data: PaymentRequest): Promise<Payment> => (await axiosInstance.post('/payments', data)).data;
export const deletePayment = async (id: number): Promise<void> => axiosInstance.delete(`/payments/${id}`);
export const filterPayments = async (filter: PaymentFilter & { userId?: number }): Promise<Payment[]> =>
  (await axiosInstance.get('/payments/filter', { params: filter })).data;
export const getPaymentsByUser = async (userId: number): Promise<Payment[]> =>
  (await axiosInstance.get(`/payments/by-user/${userId}`)).data;
export const bulkCollectPayment = async (data: BulkPaymentRequest): Promise<BulkPaymentResponse> =>
  (await axiosInstance.post('/payments/bulk', data)).data;
