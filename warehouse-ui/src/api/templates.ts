import axiosInstance from './axiosInstance';

export interface Template {
  id: number;
  key: string;
  value: string;
  createdAt: string;
}

export interface TemplateRequest {
  key: string;
  value: string;
}

export const getTemplates = async (): Promise<Template[]> =>
  (await axiosInstance.get('/templates')).data;

export const getTemplate = async (id: number): Promise<Template> =>
  (await axiosInstance.get(`/templates/${id}`)).data;

export const createTemplate = async (dto: TemplateRequest): Promise<Template> =>
  (await axiosInstance.post('/templates', dto)).data;

export const updateTemplate = async (id: number, dto: TemplateRequest): Promise<Template> =>
  (await axiosInstance.put(`/templates/${id}`, dto)).data;

export const deleteTemplate = async (id: number): Promise<void> =>
  axiosInstance.delete(`/templates/${id}`);
