import React, { useState } from 'react';
import { Table, Modal, Form, Input, Button, Space, message, Avatar } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import type { User, UserRequest } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import ImageUpload from '../../components/common/ImageUpload';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? undefined : url.startsWith('http') ? url : `/api${url}`;

const UsersPage: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const saveMutation = useMutation({
    mutationFn: (data: UserRequest) => editing ? updateUser(editing.id, data) : createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success(editing ? t('users.user_updated') : t('users.user_created'));
      setModal(false); form.resetFields(); setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); message.success(t('users.user_deleted')); },
  });

  const openEdit = (record: User) => { setEditing(record); form.setFieldsValue({ ...record, password: '' }); setModal(true); };

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    {
      title: t('upload.photo'), key: 'photo', width: 60,
      render: (_: unknown, r: User) => (
        <Avatar src={imgSrc(r.photo)} icon={<UserOutlined />} size={36} />
      ),
    },
    { title: t('common.full_name'), dataIndex: 'fullname' },
    { title: t('common.username'), dataIndex: 'username' },
    { title: t('common.tel'), dataIndex: 'tel' },
    { title: t('common.address'), dataIndex: 'address' },
    { title: t('common.gps'), dataIndex: 'gps' },
    {
      title: t('common.actions'), key: 'actions', width: 100,
      render: (_: unknown, r: User) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('users.page_title')} onAdd={() => { setEditing(null); form.resetFields(); setModal(true); }} />
      <Table dataSource={users} columns={columns} rowKey="id" loading={isLoading} />
      <Modal title={editing ? t('users.edit_user') : t('users.new_user')} open={modal}
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
          <Form.Item name="tel" label={t('common.phone')}><Input /></Form.Item>
          <Form.Item name="address" label={t('common.address')}><Input /></Form.Item>
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

export default UsersPage;
