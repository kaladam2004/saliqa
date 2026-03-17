import axiosInstance from './axiosInstance';
import type { UserReturn, UserReturnRequest } from '../types';

export const getUserReturns = async (): Promise<UserReturn[]> => (await axiosInstance.get('/user-returns')).data;
export const createUserReturn = async (data: UserReturnRequest): Promise<UserReturn> => (await axiosInstance.post('/user-returns', data)).data;
export const deleteUserReturn = async (id: number): Promise<void> => axiosInstance.delete(`/user-returns/${id}`);
