import axiosInstance from './axiosInstance';
import type { Shop, ShopRequest } from '../types';

export const getShops = async (): Promise<Shop[]> => (await axiosInstance.get('/shops')).data;
export const getShop = async (id: number): Promise<Shop> => (await axiosInstance.get(`/shops/${id}`)).data;
export const createShop = async (data: ShopRequest): Promise<Shop> => (await axiosInstance.post('/shops', data)).data;
export const updateShop = async (id: number, data: ShopRequest): Promise<Shop> => (await axiosInstance.put(`/shops/${id}`, data)).data;
export const deleteShop = async (id: number): Promise<void> => axiosInstance.delete(`/shops/${id}`);
