import React, { useState } from 'react';
import { Table, Modal, Form, Input, Button, Space, Select, Tag, message, Avatar } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../api/admins';
import type { Admin, AdminRequest } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import ImageUpload from '../../components/common/ImageUpload';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? undefined : url.startsWith('http') ? url : `/api${url}`;

const AdminsPage: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuthStore();
  const { t } = useTranslation();

  const { data: admins = [], isLoading } = useQuery({ queryKey: ['admins'], queryFn: getAdmins });

  const saveMutation = useMutation({
    mutationFn: (data: AdminRequest) => editing ? updateAdmin(editing.id, data) : createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      message.success(editing ? t('admins.admin_updated') : t('admins.admin_created'));
      setModal(false); form.resetFields(); setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admins'] }); message.success(t('admins.admin_deleted')); },
  });

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    {
      title: t('upload.photo'), key: 'photo', width: 60,
      render: (_: unknown, r: Admin) => (
        <Avatar src={imgSrc(r.photo)} icon={<UserOutlined />} size={36} />
      ),
    },
    { title: t('common.full_name'), dataIndex: 'fullname' },
    { title: t('common.username'), dataIndex: 'username' },
    { title: t('common.tel'), dataIndex: 'tel' },
    {
      title: t('common.role'), dataIndex: 'role',
      render: (role: string) => <Tag color={role === 'SUPER_ADMIN' ? 'red' : 'blue'}>{role}</Tag>,
    },
    {
      title: t('common.actions'), key: 'actions', width: 100,
      render: (_: unknown, r: Admin) => isSuperAdmin() ? (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => { setEditing(r); form.setFieldsValue({ ...r, password: '' }); setModal(true); }} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(r.id)} />
        </Space>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader title={t('admins.page_title')} onAdd={isSuperAdmin() ? () => { setEditing(null); form.resetFields(); setModal(true); } : undefined} />
      <Table dataSource={admins} columns={columns} rowKey="id" loading={isLoading} />
      <Modal title={editing ? t('admins.edit_admin') : t('admins.new_admin')} open={modal}
        onCancel={() => { setModal(false); setEditing(null); form.resetFields(); }} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="photo" label={t('upload.photo')}>
            <ImageUpload />
          </Form.Item>
          <Form.Item name="fullname" label={t('common.full_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label={t('common.username')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label={t('common.password')} rules={editing ? [] : [{ required: true }]}>
            <Input.Password placeholder={editing ? t('common.leave_blank_password') : ''} />
          </Form.Item>
          <Form.Item name="role" label={t('common.role')} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="ADMIN">{t('auth.admin')}</Select.Option>
              <Select.Option value="SUPER_ADMIN">{t('admins.super_admin')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}><Input /></Form.Item>
          <Form.Item name="description" label={t('common.description')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending} block>
              {editing ? t('common.update') : t('common.create')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AdminsPage;
