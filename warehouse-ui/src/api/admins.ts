import axiosInstance from './axiosInstance';
import type { Admin, AdminRequest } from '../types';

export const getAdmins = async (): Promise<Admin[]> => (await axiosInstance.get('/admins')).data;
export const getAdmin = async (id: number): Promise<Admin> => (await axiosInstance.get(`/admins/${id}`)).data;
export const createAdmin = async (data: AdminRequest): Promise<Admin> => (await axiosInstance.post('/admins', data)).data;
export const updateAdmin = async (id: number, data: AdminRequest): Promise<Admin> => (await axiosInstance.put(`/admins/${id}`, data)).data;
export const deleteAdmin = async (id: number): Promise<void> => axiosInstance.delete(`/admins/${id}`);
export const assignWarehouses = async (adminId: number, warehouseIds: number[]): Promise<void> =>
  axiosInstance.patch(`/admins/${adminId}/warehouses`, { warehouseIds });

export interface InvoiceStats {
  totalDelivered: number;
  totalCollected: number;
  totalDebt: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  warehouseStockValue: number;
  totalProductPickups: number;
  totalProductDelivered: number;
  totalProductReturned: number;
}
export const getInvoiceStats = async (): Promise<InvoiceStats> =>
  (await axiosInstance.get('/invoices/stats')).data;
