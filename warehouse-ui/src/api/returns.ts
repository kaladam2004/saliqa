import axiosInstance from './axiosInstance';
import type { ProductReturn, ReturnRequest } from '../types';

export const getReturns = async (): Promise<ProductReturn[]> => (await axiosInstance.get('/returns')).data;
export const createReturn = async (data: ReturnRequest): Promise<ProductReturn> => (await axiosInstance.post('/returns', data)).data;
export const deleteReturn = async (id: number): Promise<void> => axiosInstance.delete(`/returns/${id}`);
