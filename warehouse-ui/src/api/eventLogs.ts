import axiosInstance from './axiosInstance';
import type { EventLog } from '../types';

export const getEventLogs = async (): Promise<EventLog[]> => (await axiosInstance.get('/event-logs')).data;
