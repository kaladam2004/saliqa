import axiosInstance from './axiosInstance';
import type { User, UserRequest } from '../types';

export const getUsers = async (): Promise<User[]> => (await axiosInstance.get('/users')).data;
export const getUser = async (id: number): Promise<User> => (await axiosInstance.get(`/users/${id}`)).data;
export const createUser = async (data: UserRequest): Promise<User> => (await axiosInstance.post('/users', data)).data;
export const updateUser = async (id: number, data: UserRequest): Promise<User> => (await axiosInstance.put(`/users/${id}`, data)).data;
export const deleteUser = async (id: number): Promise<void> => axiosInstance.delete(`/users/${id}`);
export const updateUserGps = async (id: number, gps: string): Promise<User> =>
  (await axiosInstance.patch(`/users/${id}/gps`, { gps })).data;
