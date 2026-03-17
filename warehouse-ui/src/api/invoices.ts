import axiosInstance from './axiosInstance';
import type { Invoice, InvoiceRequest, InvoiceFilter } from '../types';

export const getInvoices = async (): Promise<Invoice[]> => (await axiosInstance.get('/invoices')).data;
export const getInvoice = async (id: number): Promise<Invoice> => (await axiosInstance.get(`/invoices/${id}`)).data;
export const createInvoice = async (data: InvoiceRequest): Promise<Invoice> => (await axiosInstance.post('/invoices', data)).data;
export const updateInvoice = async (id: number, data: InvoiceRequest): Promise<Invoice> => (await axiosInstance.put(`/invoices/${id}`, data)).data;
export const deleteInvoice = async (id: number): Promise<void> => axiosInstance.delete(`/invoices/${id}`);
export const markInvoicePaid = async (id: number): Promise<Invoice> => (await axiosInstance.patch(`/invoices/${id}/mark-paid`)).data;
export const filterInvoices = async (filter: InvoiceFilter): Promise<Invoice[]> =>
  (await axiosInstance.get('/invoices/filter', { params: filter })).data;
export const markInvoicePrinted = async (id: number): Promise<Invoice> =>
  (await axiosInstance.patch(`/invoices/${id}/mark-printed`)).data;
