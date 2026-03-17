import axiosInstance from './axiosInstance';

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosInstance.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url as string;
};
