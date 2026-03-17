import axiosInstance from './axiosInstance';
import type { AuthResponse, LoginRequest } from '../types';

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const res = await axiosInstance.post<AuthResponse>('/auth/login', data);
  return res.data;
};
