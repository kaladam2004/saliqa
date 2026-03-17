import axiosInstance from './axiosInstance';
import type { UserInvoice, UserInvoiceRequest, Product } from '../types';

export interface ProductPage {
  content: Product[];
  last: boolean;
  number: number;
  totalPages: number;
  totalElements: number;
}

export const getUserInvoices = async (): Promise<UserInvoice[]> => (await axiosInstance.get('/user-invoices')).data;
export const getUserInvoice = async (id: number): Promise<UserInvoice> => (await axiosInstance.get(`/user-invoices/${id}`)).data;
export const createUserInvoice = async (data: UserInvoiceRequest): Promise<UserInvoice> => (await axiosInstance.post('/user-invoices', data)).data;
export const deleteUserInvoice = async (id: number): Promise<void> => axiosInstance.delete(`/user-invoices/${id}`);
export const filterUserInvoices = async (params: Record<string, unknown>): Promise<UserInvoice[]> =>
  (await axiosInstance.get('/user-invoices/filter', { params })).data;
export const getRepStock = async (userId: number): Promise<Record<number, number>> =>
  (await axiosInstance.get(`/user-invoices/rep-stock/${userId}`)).data;
export const getRepProducts = async (
  userId: number, search: string, page: number, size = 10,
): Promise<ProductPage> =>
  (await axiosInstance.get(`/user-invoices/rep-products/${userId}`, { params: { search: search || undefined, page, size } })).data;
export const getUnpaidUserInvoicesByUser = async (userId: number): Promise<UserInvoice[]> =>
  (await axiosInstance.get(`/user-invoices/unpaid-by-user/${userId}`)).data;
export const markUserInvoicePaid = async (id: number): Promise<UserInvoice> =>
  (await axiosInstance.patch(`/user-invoices/${id}/mark-paid`)).data;
export const markUserInvoicePrinted = async (id: number): Promise<UserInvoice> =>
  (await axiosInstance.patch(`/user-invoices/${id}/mark-printed`)).data;
