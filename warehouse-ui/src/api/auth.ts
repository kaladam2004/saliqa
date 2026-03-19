import axiosInstance from './axiosInstance';
import type { AuthResponse, LoginRequest } from '../types';

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const res = await axiosInstance.post<AuthResponse>('/auth/login', data);
  return res.data;
};

export const changePassword = async (data: {
  id: number;
  role: string;
  oldPassword: string;
  newPassword: string;
}): Promise<void> => {
  await axiosInstance.post('/auth/change-password', data);
};
