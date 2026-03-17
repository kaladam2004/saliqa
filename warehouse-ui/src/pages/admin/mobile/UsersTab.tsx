import React, { useState } from 'react';
import { Input, Modal, Form, Button, message, Select, Tag, Avatar, Spin } from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from '../../../api/users';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../../api/admins';
import type { User, UserRequest, Admin, AdminRequest } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { useTranslation } from 'react-i18next';

type SubTab = 'users' | 'admins';

const UsersTab: React.FC = () => {
  const [sub, setSub] = useState<SubTab>('users');
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [addUserModal, setAddUserModal] = useState(false);
  const [addAdminModal, setAddAdminModal] = useState(false);
  const [userForm] = Form.useForm();
  const [adminForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuthStore();
  const { t } = useTranslation();

  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: admins = [], isLoading: adminsLoading } = useQuery({ queryKey: ['admins'], queryFn: getAdmins });

  // User mutations
  const saveUserMutation = useMutation({
    mutationFn: (data: UserRequest) => editUser ? updateUser(editUser.id, data) : createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success(editUser ? t('users.user_updated') : t('users.user_created'));
      setEditUser(null); setAddUserModal(false); userForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); message.success(t('users.user_deleted')); },
    onError: () => message.error(t('common.error')),
  });

  // Admin mutations
  const saveAdminMutation = useMutation({
    mutationFn: (data: AdminRequest) => editAdmin ? updateAdmin(editAdmin.id, data) : createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      message.success(editAdmin ? t('admins.admin_updated') : t('admins.admin_created'));
      setEditAdmin(null); setAddAdminModal(false); adminForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteAdminMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admins'] }); message.success(t('admins.admin_deleted')); },
    onError: () => message.error(t('common.error')),
  });

  const filteredUsers = users.filter(u =>
    u.fullname.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAdmins = admins.filter(a =>
    a.fullname?.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = (id: number, type: 'user' | 'admin', name: string) => {
    Modal.confirm({
      title: `"${name}" ${t('common.confirm_delete')}`,
      okText: t('confirm_delete.ok'), cancelText: t('confirm_delete.cancel'),
      okButtonProps: { danger: true },
      onOk: () => type === 'user' ? deleteUserMutation.mutate(id) : deleteAdminMutation.mutate(id),
    });
  };

  const PersonCard: React.FC<{
    name: string; username: string; tel?: string; role?: string;
    onEdit: () => void; onDelete: () => void; canDelete?: boolean;
  }> = ({ name, username, tel, role, onEdit, onDelete, canDelete = true }) => (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '12px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <Avatar size={42} icon={<UserOutlined />} style={{ background: '#e8f4ff', color: '#1677ff', flexShrink: 0 }}>
        {name?.[0]?.toUpperCase()}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{name}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>@{username}</div>
        {tel && <div style={{ fontSize: 11, color: '#9ca3af' }}>{tel}</div>}
        {role && <Tag color={role === 'SUPER_ADMIN' ? 'red' : 'blue'} style={{ margin: '2px 0 0', fontSize: 10 }}>{role}</Tag>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: '#e8f4ff', color: '#1677ff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EditOutlined style={{ fontSize: 14 }} />
        </button>
        {canDelete && (
          <button onClick={onDelete} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#fff1f0', color: '#f5222d', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DeleteOutlined style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>
  );

  const isLoading = sub === 'users' ? usersLoading : adminsLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', padding: '10px 12px 4px', gap: 8, flexShrink: 0 }}>
        {([['users', <UserOutlined />, t('menu.sales_reps')], ['admins', <TeamOutlined />, t('menu.admins')]] as [SubTab, React.ReactNode, string][]).map(([key, icon, label]) => (
          <button key={key} onClick={() => setSub(key)} style={{
            flex: 1, border: 'none', borderRadius: 12, padding: '10px 0',
            fontWeight: sub === key ? 600 : 400, cursor: 'pointer', fontSize: 13,
            background: sub === key ? '#1677ff' : '#e8ecf4',
            color: sub === key ? '#fff' : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s',
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder={t('common.search') || 'Ҷустуҷӯ...'}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 12 }} allowClear
        />
      </div>

      {/* List */}
      {isLoading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 80px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sub === 'users' && filteredUsers.map(u => (
                <PersonCard
                  key={u.id} name={u.fullname} username={u.username} tel={u.tel}
                  onEdit={() => { setEditUser(u); userForm.setFieldsValue({ ...u, password: '' }); setAddUserModal(true); }}
                  onDelete={() => confirmDelete(u.id, 'user', u.fullname)}
                />
              ))}
              {sub === 'admins' && filteredAdmins.map(a => (
                <PersonCard
                  key={a.id} name={a.fullname || a.username} username={a.username} tel={a.tel} role={a.role}
                  onEdit={() => isSuperAdmin() ? (setEditAdmin(a), adminForm.setFieldsValue({ ...a, password: '' }), setAddAdminModal(true)) : message.warning(t('common.only_super_admin'))}
                  onDelete={() => confirmDelete(a.id, 'admin', a.fullname || a.username)}
                  canDelete={isSuperAdmin()}
                />
              ))}
            </div>
          </div>
        )
      }

      {/* FAB */}
      <button
        onClick={() => {
          if (sub === 'users') { setEditUser(null); userForm.resetFields(); setAddUserModal(true); }
          else if (isSuperAdmin()) { setEditAdmin(null); adminForm.resetFields(); setAddAdminModal(true); }
          else message.warning(t('common.only_super_admin'));
        }}
        style={{
          position: 'fixed', bottom: 76, right: 20,
          width: 52, height: 52, borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #1677ff, #0958d9)',
          color: '#fff', fontSize: 24, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <PlusOutlined />
      </button>

      {/* Add/Edit User Modal */}
      <Modal
        title={editUser ? t('users.edit_user') : t('users.new_user')}
        open={addUserModal}
        onCancel={() => { setAddUserModal(false); setEditUser(null); userForm.resetFields(); }}
        footer={null} destroyOnHidden
      >
        <Form form={userForm} layout="vertical" onFinish={saveUserMutation.mutate}>
          <Form.Item name="fullname" label={t('common.full_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label={t('common.username')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label={t('common.password')} rules={editUser ? [] : [{ required: true }]}>
            <Input.Password placeholder={editUser ? t('common.leave_blank_password') : ''} />
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}><Input /></Form.Item>
          <Form.Item name="address" label={t('common.address')}><Input /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saveUserMutation.isPending} block>
            {editUser ? t('common.update') : t('common.create')}
          </Button>
        </Form>
      </Modal>

      {/* Add/Edit Admin Modal */}
      <Modal
        title={editAdmin ? t('admins.edit_admin') : t('admins.new_admin')}
        open={addAdminModal}
        onCancel={() => { setAddAdminModal(false); setEditAdmin(null); adminForm.resetFields(); }}
        footer={null} destroyOnHidden
      >
        <Form form={adminForm} layout="vertical" onFinish={saveAdminMutation.mutate}>
          <Form.Item name="fullname" label={t('common.full_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label={t('common.username')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label={t('common.password')} rules={editAdmin ? [] : [{ required: true }]}>
            <Input.Password placeholder={editAdmin ? t('common.leave_blank_password') : ''} />
          </Form.Item>
          <Form.Item name="role" label={t('common.role')} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="ADMIN">{t('auth.admin')}</Select.Option>
              <Select.Option value="SUPER_ADMIN">{t('admins.super_admin')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}><Input /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saveAdminMutation.isPending} block>
            {editAdmin ? t('common.update') : t('common.create')}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersTab;
