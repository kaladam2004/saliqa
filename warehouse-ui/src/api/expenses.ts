import axiosInstance from './axiosInstance';
import type { Expense, ExpenseRequest } from '../types';

export const getExpenses = async (): Promise<Expense[]> => (await axiosInstance.get('/expenses')).data;
export const getExpensesByAdmin = async (adminId: number): Promise<Expense[]> =>
  (await axiosInstance.get(`/expenses/by-admin/${adminId}`)).data;
export const getExpensesByUser = async (userId: number): Promise<Expense[]> =>
  (await axiosInstance.get(`/expenses/by-user/${userId}`)).data;
export const getPendingUserExpenses = async (): Promise<Expense[]> =>
  (await axiosInstance.get('/expenses/pending-user')).data;
export const createExpense = async (data: ExpenseRequest): Promise<Expense> => (await axiosInstance.post('/expenses', data)).data;
export const approveExpense = async (id: number, adminId: number): Promise<Expense> =>
  (await axiosInstance.patch(`/expenses/${id}/approve`, null, { params: { adminId } })).data;
export const deleteExpense = async (id: number): Promise<void> => axiosInstance.delete(`/expenses/${id}`);
export const filterExpenses = async (params: Record<string, unknown>): Promise<Expense[]> =>
  (await axiosInstance.get('/expenses/filter', { params })).data;
