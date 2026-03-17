import axiosInstance from './axiosInstance';
import type { Product, ProductRequest } from '../types';

export const getProducts = async (): Promise<Product[]> => (await axiosInstance.get('/products')).data;
export const getProduct = async (id: number): Promise<Product> => (await axiosInstance.get(`/products/${id}`)).data;
export const createProducts = async (data: ProductRequest[]): Promise<Product[]> => (await axiosInstance.post('/products/batch', data)).data;
export const updateProduct = async (id: number, data: ProductRequest): Promise<Product> => (await axiosInstance.put(`/products/${id}`, data)).data;
export const deleteProduct = async (id: number): Promise<void> => axiosInstance.delete(`/products/${id}`);
export const addToWarehouse = async (warehouseId: number, productIds: number[]): Promise<void> =>
  axiosInstance.post(`/products/warehouses/${warehouseId}/add`, productIds);
export const addQuantity = async (id: number, quantity: number, adminId?: number, notes?: string): Promise<Product> =>
  (await axiosInstance.patch(`/products/${id}/quantity`, { quantity, adminId, notes })).data;
