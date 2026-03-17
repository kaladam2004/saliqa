import axiosInstance from './axiosInstance';
import type { UserPayment, UserPaymentRequest, BulkUserPaymentRequest, BulkUserPaymentResponse } from '../types';

export const getUserPayments = async (): Promise<UserPayment[]> => (await axiosInstance.get('/user-payments')).data;
export const getUserPaymentsByUser = async (userId: number): Promise<UserPayment[]> => (await axiosInstance.get(`/user-payments/by-user/${userId}`)).data;
export const getPendingUserPayments = async (): Promise<UserPayment[]> => (await axiosInstance.get('/user-payments/pending')).data;
export const createUserPayment = async (data: UserPaymentRequest): Promise<UserPayment> => (await axiosInstance.post('/user-payments', data)).data;
export const acceptUserPayment = async (id: number): Promise<UserPayment> => (await axiosInstance.patch(`/user-payments/${id}/accept`)).data;
export const deleteUserPayment = async (id: number): Promise<void> => axiosInstance.delete(`/user-payments/${id}`);
export const bulkAcceptPayment = async (data: BulkUserPaymentRequest): Promise<BulkUserPaymentResponse> =>
  (await axiosInstance.post('/user-payments/bulk', data)).data;
