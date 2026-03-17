import axiosInstance from './axiosInstance';
import type { Admin, AdminRequest } from '../types';

export const getAdmins = async (): Promise<Admin[]> => (await axiosInstance.get('/admin/admins')).data;
export const getAdmin = async (id: number): Promise<Admin> => (await axiosInstance.get(`/admin/admins/${id}`)).data;
export const createAdmin = async (data: AdminRequest): Promise<Admin> => (await axiosInstance.post('/admin/admins', data)).data;
export const updateAdmin = async (id: number, data: AdminRequest): Promise<Admin> => (await axiosInstance.put(`/admin/admins/${id}`, data)).data;
export const deleteAdmin = async (id: number): Promise<void> => axiosInstance.delete(`/admin/admins/${id}`);
export const assignWarehouses = async (adminId: number, warehouseIds: number[]): Promise<void> =>
  axiosInstance.post(`/admin/admins/${adminId}/warehouses`, warehouseIds);
