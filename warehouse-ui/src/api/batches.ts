import axiosInstance from './axiosInstance';

export interface Batch {
  id: number;
  name: string;
  manufactureDate?: string;
  expireDate?: string;
  batchString?: string;
  productId: number;
  product?: { id: number; name: string; image?: string };
  createdAt: string;
}

export interface BatchRequest {
  name: string;
  manufactureDate?: string;
  expireDate?: string;
  batchString?: string;
  productId: number;
}

export const getBatches = async (): Promise<Batch[]> =>
  (await axiosInstance.get('/batches')).data;

export const getBatch = async (id: number): Promise<Batch> =>
  (await axiosInstance.get(`/batches/${id}`)).data;

export const createBatch = async (dto: BatchRequest): Promise<Batch> =>
  (await axiosInstance.post('/batches', dto)).data;

export const updateBatch = async (id: number, dto: BatchRequest): Promise<Batch> =>
  (await axiosInstance.put(`/batches/${id}`, dto)).data;

export const deleteBatch = async (id: number): Promise<void> =>
  axiosInstance.delete(`/batches/${id}`);
