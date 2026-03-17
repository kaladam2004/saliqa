import axiosInstance from './axiosInstance';
import type { Warehouse, WarehouseRequest } from '../types';

export const getWarehouses = async (): Promise<Warehouse[]> => (await axiosInstance.get('/warehouses')).data;
export const getWarehouse = async (id: number): Promise<Warehouse> => (await axiosInstance.get(`/warehouses/${id}`)).data;
export const createWarehouse = async (data: WarehouseRequest): Promise<Warehouse> => (await axiosInstance.post('/warehouses', data)).data;
export const updateWarehouse = async (id: number, data: WarehouseRequest): Promise<Warehouse> => (await axiosInstance.put(`/warehouses/${id}`, data)).data;
export const deleteWarehouse = async (id: number): Promise<void> => axiosInstance.delete(`/warehouses/${id}`);
